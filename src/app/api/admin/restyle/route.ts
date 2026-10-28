import { NextResponse } from "next/server";
import { samPhrase } from "@/lib/finish";
import { depthLayers, paintCard } from "@/lib/meta";
import { photoBase64 } from "@/lib/photos";
import { packFor } from "@/lib/species";
import { load, update } from "@/lib/store";
import { drawStyle } from "@/lib/styles";
import { isAdmin, withUser } from "@/lib/session";
import { HOSTED } from "@/lib/supabase";
import type { Card, State } from "@/lib/types";

export const maxDuration = 300;

// Styles that were taken out of the pool: painted onto the pet itself they looked like a glitch (the shine belongs on
// the card, not on the animal). Cards still painted in one are painted again, in their slot's style or a fresh draw,
// with the same moment; the card keeps its name, words and finish. GET says how many are left.
const RETIRED = ["holographic foil"];
const BATCH = 3;
const needs = (c: Card) => !!c.art && RETIRED.includes((c.style ?? "").toLowerCase());
const styleFor = (s: State, c: Card) => {
  const pet = s.pets.find((p) => p.id === c.petId);
  const slot = pet && c.slotId ? packFor(pet.species).quest.find((q) => q.id === c.slotId) : null;
  if (slot && !RETIRED.includes(slot.style.toLowerCase())) return { label: slot.style, prompt: slot.style };
  const d = drawStyle();
  return { label: d.label, prompt: d.prompt };
};

export const GET = withUser(async () => {
  if (HOSTED && !isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 }); // local mode is the owner's own machine
  const s = await load();
  return NextResponse.json({ left: s.cards.filter(needs).length });
});

export const POST = withUser(async () => {
  if (HOSTED && !isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  const s = await load();
  const todo = s.cards.filter(needs).slice(0, BATCH);
  const done = await Promise.all(
    todo.map(async (card) => {
      const pet = s.pets.find((p) => p.id === card.petId);
      const photo = s.photos.find((p) => p.id === card.photoId);
      if (!pet || !photo) return null;
      const avatar = s.photos.find((p) => p.id === pet.avatarPhotoId);
      const style = styleFor(s, card);
      const art = await paintCard(await photoBase64(photo.file), pet, style.prompt, card.scene || card.observation, avatar ? await photoBase64(avatar.file) : null).catch(() => null);
      if (!art) return null;
      const layers = card.rarity >= 2 ? await depthLayers(art, samPhrase(pet.species)).catch(() => ({ fg: null, plate: null })) : { fg: null, plate: null };
      return { id: card.id, style: style.label, art: `/api/art/${art}`, fg: layers.fg ? `/api/art/${layers.fg}` : null, plate: layers.plate ? `/api/art/${layers.plate}` : null, layersV: layers.plate ? 2 : undefined };
    }),
  );
  await update((f) => {
    for (const d of done) {
      const c = d && f.cards.find((x) => x.id === d.id);
      if (c && d) Object.assign(c, d);
    }
  });
  const after = await load();
  return NextResponse.json({ fixed: done.filter(Boolean).length, left: after.cards.filter(needs).length });
});
