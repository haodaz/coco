import sharp from "sharp";
import { clarityOf, LEVELS } from "./memory";
import { paintLikeness } from "./meta";
import { photoBase64, readPhoto } from "./photos";
import { getMedia } from "./media";
import type { Pet, State } from "./types";

// Keeps the AI's picture of the pet in step with what it knows. Repainted whenever clarity changes level:
// below level 2 from the profile alone (a typical animal of that breed), from then on from the pet's own imprints.
// Returns true when the state changed.
export async function refreshLikeness(state: State, pet: Pet): Promise<boolean> {
  const { level } = clarityOf(state, pet);
  if (pet.likeness && pet.likeness.level === level) return false;
  const fromImprints = level >= 2;
  let refs: string[] = [];
  let learned: string[] = [];
  if (fromImprints) {
    // the clearest moments first: rarest cards, then the avatar photo
    const cards = state.cards.filter((c) => c.petId === pet.id).sort((a, b) => b.rarity - a.rarity);
    const photoIds = [...new Set([pet.avatarPhotoId, ...cards.map((c) => c.photoId)].filter(Boolean) as string[])].slice(0, 4);
    const photos = photoIds.map((id) => state.photos.find((p) => p.id === id)).filter((p) => !!p);
    refs = await Promise.all(photos.map((p) => photoBase64(p.file)));
    const traces = state.traces.filter((t) => t.petId === pet.id).sort((a, b) => Number(b.source.type === "note") - Number(a.source.type === "note"));
    learned = [...new Set(traces.map((t) => (t.detail ? `${t.label} (${t.detail})` : t.label)))];
  }
  const file = await paintLikeness(pet, refs, learned);
  if (!file) return false;
  pet.likeness = { file, level, from: fromImprints ? "imprints" : "profile", at: new Date().toISOString() };
  return true;
}

// The likeness at a level's resolution: shrink to the grid, cut the colours down, then blow it up with hard pixel edges.
// With no painting yet (practice mode) the avatar photo stands in.
export async function pixelated(state: State, pet: Pet, level: number): Promise<Buffer> {
  const src = pet.likeness
    ? await getMedia(pet.likeness.file)
    : await readPhoto(state.photos.find((p) => p.id === pet.avatarPhotoId)?.file ?? "");
  const base = sharp(src).rotate().resize(768, 1024, { fit: "cover" });
  const spec = LEVELS[Math.max(0, Math.min(level, LEVELS.length - 1))];
  if (!spec.grid) return base.png().toBuffer();
  const [w, h] = spec.grid;
  const small = await base.resize(w, h, { fit: "cover", kernel: "cubic" }).png({ palette: true, colours: spec.colours, dither: 0 }).toBuffer();
  const scale = Math.ceil(768 / w);
  return sharp(small).resize(w * scale, h * scale, { kernel: "nearest" }).png().toBuffer();
}
