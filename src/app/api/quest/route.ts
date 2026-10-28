import { after, NextResponse } from "next/server";
import { samPhrase } from "@/lib/finish";
import { refreshLikeness } from "@/lib/likeness";
import { depthLayers, paintCard, readQuestPhoto } from "@/lib/meta";
import { photoBase64, storePhoto, uploadMeta } from "@/lib/photos";
import { packFor } from "@/lib/species";
import { load, newId, update } from "@/lib/store";
import type { Card, Trace } from "@/lib/types";
import { currentUserId, runAs, withUser } from "@/lib/session";
import { overLimit } from "@/lib/limits";
import { unlockMoves } from "@/lib/character";
import { STARTER_MOVE, starterDoneAt } from "@/lib/moves";
import { writeIn } from "@/lib/meta";

export const maxDuration = 300; // seconds; model calls and painting take a while

// One quest photo → stored photo, traces with their source, and a card for the owner.
export const POST = withUser(async (req: Request) => {
  const limited = await overLimit("quest", true);
  if (limited) return limited;
  const form = await req.formData();
  const file = form.get("photo");
  const petId = String(form.get("petId") ?? "");
  const slotId = String(form.get("slotId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "photo required" }, { status: 400 });

  const s = await load();
  const pet = s.pets.find((p) => p.id === petId);
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const slot = packFor(pet.species).quest.find((q) => q.id === slotId);
  if (!slot) return NextResponse.json({ error: "unknown slot" }, { status: 400 });

  const photo = await storePhoto(file, pet.id, slot.id, uploadMeta(form.get("photoMeta")));
  const b64 = await photoBase64(photo.file);
  const avatar = s.photos.find((p) => p.id === pet.avatarPhotoId);
  const ref = avatar ? await photoBase64(avatar.file) : null; // which animal is the pet, when there are several
  // the reading tells the painter which moment to paint; the painting itself is a new picture in the slot's style
  writeIn(s.settings?.lang); // cards are written in the owner's language
  const reading = await readQuestPhoto(b64, slot, pet.name || "me", pet.sex, ref);
  const art = await paintCard(b64, pet, slot.style, reading.scene || reading.observation, ref);
  // rare cards and up get a depth layer; a failed cutout just leaves the card flat
  const layers = art && reading.rarity >= 2 ? await depthLayers(art, samPhrase(pet.species)) : { fg: null, plate: null };

  const traces: Trace[] = reading.traces.map((t) => ({
    id: newId("tr"),
    petId: pet.id,
    ...t,
    source: { type: "photo", photoId: photo.id },
    at: photo.takenAt,
  }));
  const card: Card = {
    id: newId("card"),
    petId: pet.id,
    kind: "quest",
    slotId: slot.id,
    name: reading.cardName,
    rarity: reading.rarity,
    style: slot.style,
    art: art ? `/api/art/${art}` : null,
    fg: layers.fg ? `/api/art/${layers.fg}` : null,
    plate: layers.plate ? `/api/art/${layers.plate}` : null,
    layersV: layers.plate ? 2 : undefined,
    line: reading.line,
    observation: reading.observation,
    scene: reading.scene,
    photoId: photo.id,
    createdAt: new Date().toISOString(),
  };
  // added to whatever the state is by now (several slots can be filled at once); a slot holds one card, so replacing
  // the photo replaces the card, and the card that finishes the Starter Kit brings the first move card out with it
  let bonus: string | null = null;
  await update((f) => {
    const p = f.pets.find((x) => x.id === pet.id);
    if (!p) return;
    const wasDone = !!starterDoneAt(p, f);
    f.cards = f.cards.filter((c) => !(c.petId === pet.id && c.slotId === slot.id));
    f.photos.push(photo);
    f.traces.push(...traces);
    f.cards.push(card);
    bonus = !wasDone && starterDoneAt(p, f) ? STARTER_MOVE : null;
    if (bonus) p.moveCards = [...(p.moveCards ?? []), { mood: bonus, at: new Date().toISOString(), from: "starter" }];
  });
  // after answering: a new imprint may raise clarity (the AI repaints its picture of the pet), and more memory may
  // unlock new moves (about a minute)
  const owner = currentUserId();
  after(() => runAs(owner, async () => {
    const fresh = await load();
    const p = fresh.pets.find((x) => x.id === pet.id);
    if (p && (await refreshLikeness(fresh, p).catch(() => false))) await update((f) => { const q = f.pets.find((x) => x.id === pet.id); if (q) q.likeness = p.likeness; });
    await unlockMoves(pet.id);
  }).catch(() => {}));
  return NextResponse.json({ card, traces, bonus });
});
