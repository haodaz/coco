import { NextResponse } from "next/server";
import { openedToday, PER_DAY } from "@/lib/daily";
import { samPhrase } from "@/lib/finish";
import { refreshLikeness } from "@/lib/likeness";
import { clarityOf, SENSES } from "@/lib/memory";
import { depthLayer, paintCard, readMomentPhoto } from "@/lib/meta";
import { photoBase64, storePhoto, uploadMeta } from "@/lib/photos";
import { packFor } from "@/lib/species";
import { load, newId, save } from "@/lib/store";
import { drawStyle } from "@/lib/styles";
import type { Card, Trace } from "@/lib/types";
import { overLimit } from "@/lib/limits";
import { withUser } from "@/lib/session";

export const maxDuration = 300; // seconds; model calls and painting take a while

// Open today's pack: each photo becomes a card in a style drawn from the blind-box pool;
// a legend-tier style makes the card a legend.
export const POST = withUser(async (req: Request) => {
  const form = await req.formData();
  const s = await load();
  const pet = s.pets.find((p) => p.id === String(form.get("petId") ?? ""));
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const left = PER_DAY - openedToday(s, pet.id);
  const limited = await overLimit("quest", true); // the site-wide painting cap applies to packs too
  if (limited && limited.status === 503) return limited;
  const files = form.getAll("photos").filter((f): f is File => f instanceof File).slice(0, Math.max(0, left));
  const metas = form.getAll("photosMeta");
  if (!files.length) return NextResponse.json({ error: left > 0 ? "no photos" : "today's pack is already open" }, { status: 400 });

  const kinds = [...new Set(packFor(pet.species).quest.map((q) => q.pattern))].map((p) => ({ pattern: p, label: SENSES[p] }));
  const before = clarityOf(s, pet);
  const avatar = s.photos.find((p) => p.id === pet.avatarPhotoId);
  const ref = avatar ? await photoBase64(avatar.file) : null; // which animal is the pet, when there are several
  const made = await Promise.all(
    files.map(async (file, i) => {
      const photo = await storePhoto(file, pet.id, null, uploadMeta(metas[i] ?? null));
      const b64 = await photoBase64(photo.file);
      const reading = await readMomentPhoto(b64, kinds, pet.name || "me", pet.sex, ref);
      const style = drawStyle();
      const rarity = Math.max(reading.rarity, style.tier) as 1 | 2 | 3;
      const art = await paintCard(b64, pet, style.prompt, reading.observation, ref);
      const fg = art && rarity >= 2 ? await depthLayer(art, samPhrase(pet.species)).catch(() => null) : null;
      const traces: Trace[] = reading.traces.map((t) => ({ id: newId("tr"), petId: pet.id, ...t, source: { type: "photo", photoId: photo.id }, at: photo.takenAt }));
      const card: Card = {
        id: newId("card"),
        petId: pet.id,
        kind: "daily",
        slotId: null,
        pattern: reading.pattern,
        name: reading.cardName,
        rarity,
        style: style.label,
        art: art ? `/api/art/${art}` : null,
        fg: fg ? `/api/art/${fg}` : null,
        line: reading.line,
        observation: reading.observation,
        photoId: photo.id,
        createdAt: new Date().toISOString(),
      };
      return { photo, traces, card };
    }),
  );
  for (const m of made) {
    s.photos.push(m.photo);
    s.traces.push(...m.traces);
    s.cards.push(m.card);
  }
  await refreshLikeness(s, pet).catch(() => false);
  await save(s);
  return NextResponse.json({ cards: made.map((m) => m.card), levelBefore: before.level, levelAfter: clarityOf(s, pet).level, left: PER_DAY - openedToday(s, pet.id) });
});
