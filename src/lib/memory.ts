import { packFor, type Pattern } from "./species";
import type { Card, Pet, State } from "./types";

// Imprints: every card is a moment the AI keeps as memory. Clarity is how well the AI knows this pet,
// earned from imprints, never from time alone, and shown as the resolution of the AI's picture of the pet.

// Points: each imprint 1, each new kind of moment 2, each different day of the pet's life 1, each owner's note 2.
export const POINTS = { imprint: 1, kind: 2, day: 1, note: 2 } as const;

// Resolution of the portrait at each level: grid width × height and number of colours. The last level is the full painting.
// Pacing: the starter pack (10 cards, each with a note) reaches level 3, the outline of the pet. After that, daily booster packs
// (up to 3 cards a day, about 4 points on an average day) reach level 4 in ~10 days, level 5 (its own features) in ~30 days,
// then ~2, ~3 and ~5 months for the last levels.
export const LEVELS: { at: number; grid: [number, number] | null; colours: number }[] = [
  { at: 0, grid: [6, 8], colours: 2 },
  { at: 4, grid: [9, 12], colours: 3 },
  { at: 12, grid: [12, 16], colours: 4 },
  { at: 30, grid: [18, 24], colours: 8 },
  { at: 100, grid: [24, 32], colours: 12 },
  { at: 170, grid: [32, 43], colours: 16 }, // about a month of booster packs: its own features show
  { at: 280, grid: [48, 64], colours: 32 },
  { at: 420, grid: [72, 96], colours: 64 },
  { at: 650, grid: null, colours: 0 },
];

// What the twin knows about, by the kind of moment a card holds. A sense with no imprints stays dark.
export const SENSES: Record<Pattern, string> = {
  moon: "Sleep and rest",
  bowl: "Food and treats",
  ball: "Play",
  hearts: "You",
  path: "Walks",
  wind: "Trips",
  circles: "Others",
  mystery: "Quirks",
  sun: "Lookouts",
  nest: "Home",
  leaf: "Little details",
  waves: "How it moves",
};

export type Clarity = {
  points: number;
  level: number;
  maxLevel: number;
  floor: number; // points where this level starts
  next: number | null; // points where the next level starts
  imprints: number;
  kinds: number;
  days: number;
  notes: number;
  senses: { pattern: Pattern; label: string; imprints: number }[];
};

export function clarityOf(state: State, pet: Pet): Clarity {
  const cards = state.cards.filter((c) => c.petId === pet.id);
  const slots = packFor(pet.species).quest;
  const patternOf = (c: Card) => c.pattern ?? slots.find((s) => s.id === c.slotId)?.pattern ?? null;
  const kinds = new Set(cards.map(patternOf).filter(Boolean));
  const days = new Set(
    cards.map((c) => {
      const photo = state.photos.find((p) => p.id === c.photoId);
      return (photo?.takenAt ?? c.createdAt).slice(0, 10);
    }),
  );
  const notes = cards.filter((c) => c.note?.text).length;
  const points = cards.length * POINTS.imprint + kinds.size * POINTS.kind + days.size * POINTS.day + notes * POINTS.note;
  let level = 0;
  LEVELS.forEach((l, i) => points >= l.at && (level = i));
  const patterns = [...new Set(slots.map((s) => s.pattern))];
  return {
    points,
    level,
    maxLevel: LEVELS.length - 1,
    floor: LEVELS[level].at,
    next: LEVELS[level + 1]?.at ?? null,
    imprints: cards.length,
    kinds: kinds.size,
    days: days.size,
    notes,
    senses: patterns.map((p) => ({ pattern: p, label: SENSES[p], imprints: cards.filter((c) => patternOf(c) === p).length })),
  };
}

// How the AI would describe what it sees at this level, in plain words.
export function levelName(level: number, pet: Pet) {
  const kind = pet.species === "small_mammal" ? "small animal" : pet.species === "other" ? "animal" : pet.species;
  const breed = pet.breed ?? kind;
  const name = pet.name || "your pet";
  return [
    "Just a shape",
    `Some kind of ${kind}`,
    `A ${breed}`,
    `Starting to look like ${name}`,
    `${name}, roughly`,
    name,
    `${name}, clearly`,
    `${name}, in detail`,
    `${name}, as you know ${pet.sex === "male" ? "him" : pet.sex === "female" ? "her" : "them"}`,
  ][level];
}
