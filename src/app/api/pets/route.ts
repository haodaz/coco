import { NextResponse } from "next/server";
import { identify } from "@/lib/meta";
import { photoBase64, storePhoto } from "@/lib/photos";
import { load, newId, save } from "@/lib/store";
import type { Pet } from "@/lib/types";

// Onboarding step 1: one photo in, a pre-filled profile out. The owner corrects it next (PATCH /api/pets/[id]).
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "photo required" }, { status: 400 });

  const petId = newId("pet");
  const photo = await storePhoto(file, petId, null);
  const id = await identify(await photoBase64(photo.file));

  const pet: Pet = {
    id: petId,
    name: "",
    species: id.species,
    breed: id.breedCandidates[0]?.name ?? null,
    breedCandidates: id.breedCandidates,
    appearance: { coat: id.coat, marks: id.marks, size: id.size },
    born: null,
    sex: null,
    credential: "unknown",
    avatarPhotoId: photo.id,
    createdAt: new Date().toISOString(),
  };
  const s = await load();
  s.pets.push(pet);
  s.photos.push(photo);
  await save(s);
  return NextResponse.json({ pet });
}
