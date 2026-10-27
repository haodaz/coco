import { samPhrase } from "./finish";
import { depthLayers, paintCard } from "./meta";
import { photoBase64 } from "./photos";
import { load, update } from "./store";
import { drawStyle } from "./styles";
import type { Card, Pet, State } from "./types";

// Painting a shared memory into its card: a style drawn from the blind-box pool, the rarity it lands on, and for rare
// cards the two layers (the scene without the pet, the pet with what it wears and holds). Memories are painted in the
// background as soon as they are shared, and wait sealed in the pool; a pack only picks from the pool, so it opens at
// once. A painting is retried once.

export type Painted = Pick<Card, "style" | "rarity" | "art" | "fg" | "plate" | "layersV">;

export async function paintOne(state: State, pet: Pet, card: Card, ref: string | null): Promise<Painted | null> {
  const photo = state.photos.find((p) => p.id === card.photoId);
  if (!photo) return null;
  const style = drawStyle();
  const rarity = Math.max(card.rarity, style.tier) as 1 | 2 | 3;
  const b64 = await photoBase64(photo.file);
  const go = () => paintCard(b64, pet, style.prompt, card.scene || card.observation, ref);
  const art = await go().catch(() => go()).catch(() => undefined);
  if (art === undefined) return null;
  const layers = art && rarity >= 2 ? await depthLayers(art, samPhrase(pet.species)) : { fg: null, plate: null };
  return { style: style.label, rarity, art: art ? `/api/art/${art}` : null, fg: layers.fg ? `/api/art/${layers.fg}` : null, plate: layers.plate ? `/api/art/${layers.plate}` : null, layersV: layers.plate ? 2 : undefined };
}

// paint these cards (they stay sealed); returns the ids that were painted
export async function paintInPool(petId: string, cardIds: string[]): Promise<string[]> {
  const s = await load();
  const pet = s.pets.find((p) => p.id === petId);
  if (!pet) return [];
  const avatar = s.photos.find((p) => p.id === pet.avatarPhotoId);
  const ref = avatar ? await photoBase64(avatar.file) : null;
  const cards = s.cards.filter((c) => cardIds.includes(c.id));
  const done = await Promise.all(cards.map(async (c) => ({ id: c.id, p: await paintOne(s, pet, c, ref).catch(() => null) })));
  await update((f) => {
    for (const d of done) {
      const c = f.cards.find((x) => x.id === d.id);
      if (!c) continue;
      delete c.painting;
      if (d.p) Object.assign(c, d.p);
    }
  });
  return done.filter((d) => d.p).map((d) => d.id);
}

// Keep the pool ready so a pack opens at once. New memories come first (they are painted when shared); only when the
// owner has M pt for a pack and the pool is short does the painter make new versions of memories already opened,
// the least-versioned first, each in a new style.
export async function topUpPool(petId: string, admin: boolean) {
  const { balance, PACK_COST, PACK_SIZE, sealedPrints } = await import("./points");
  const { newId } = await import("./store");
  const s = await load();
  const short = PACK_SIZE - sealedPrints(s, petId).length;
  if (short <= 0 || (!admin && balance(s, petId) < PACK_COST)) return;
  const opened = s.cards.filter((c) => c.petId === petId && !c.sealed && c.kind !== "legendary" && c.art);
  if (!opened.length) return;
  const versions = (c: Card) => s.cards.filter((x) => x.versionOf === (c.versionOf ?? c.id)).length;
  const bases = [...new Map(opened.map((c) => [c.versionOf ?? c.id, c])).values()]
    .map((c) => ({ c, n: versions(c), r: Math.random() }))
    .sort((a, b) => a.n - b.n || a.r - b.r)
    .slice(0, short)
    .map((x) => x.c);
  const now = new Date().toISOString();
  const made: Card[] = bases.map((b) => ({
    id: newId("card"), petId, kind: "daily", slotId: null, pattern: b.pattern, name: b.name, rarity: 1, style: "", art: null, fg: null, plate: null,
    line: b.line, observation: b.observation, scene: b.scene, note: b.note ?? null, photoId: b.photoId, createdAt: now,
    sealed: true, painting: now, versionOf: b.versionOf ?? b.id,
  }));
  await update((f) => void f.cards.push(...made));
  await paintInPool(petId, made.map((c) => c.id));
}
