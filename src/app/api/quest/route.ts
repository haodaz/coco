import { NextResponse } from "next/server";
import { samPhrase } from "@/lib/finish";
import { refreshLikeness } from "@/lib/likeness";
import { depthLayer, paintCard, readQuestPhoto } from "@/lib/meta";
import { photoBase64, storePhoto } from "@/lib/photos";
import { packFor } from "@/lib/species";
import { load, newId, save } from "@/lib/store";
import type { Card, Trace } from "@/lib/types";

// One quest photo → stored photo, traces with their source, and a card for the owner.
export async function POST(req: Request) {
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

  const photo = await storePhoto(file, pet.id, slot.id);
  const b64 = await photoBase64(photo.file);
  const avatar = s.photos.find((p) => p.id === pet.avatarPhotoId);
  const ref = avatar ? await photoBase64(avatar.file) : null; // which animal is the pet, when there are several
  // the reading tells the painter which moment to paint; the painting itself is a new picture in the slot's style
  const reading = await readQuestPhoto(b64, slot, pet.name || "me", pet.sex, ref);
  const art = await paintCard(b64, pet, slot.style, reading.observation, ref);
  // rare cards and up get a depth layer; a failed cutout just leaves the card flat
  const fg = art && reading.rarity >= 2 ? await depthLayer(art, samPhrase(pet.species)).catch(() => null) : null;

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
    fg: fg ? `/api/art/${fg}` : null,
    line: reading.line,
    observation: reading.observation,
    photoId: photo.id,
    createdAt: new Date().toISOString(),
  };
  // a slot holds one card: replacing the photo replaces the card
  s.cards = s.cards.filter((c) => !(c.petId === pet.id && c.slotId === slot.id));
  s.photos.push(photo);
  s.traces.push(...traces);
  s.cards.push(card);
  // a new imprint may raise clarity; the AI then repaints its picture of the pet
  await refreshLikeness(s, pet).catch(() => false);
  await save(s);
  return NextResponse.json({ card, traces });
}
