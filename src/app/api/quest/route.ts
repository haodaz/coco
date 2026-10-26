import { NextResponse } from "next/server";
import { paintCard, readQuestPhoto } from "@/lib/meta";
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
  // reading the photo and painting the art don't depend on each other
  const [reading, art] = await Promise.all([readQuestPhoto(b64, slot, pet.name || "me"), paintCard(b64, slot.style, pet.breed ?? pet.species)]);

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
  await save(s);
  return NextResponse.json({ card, traces });
}
