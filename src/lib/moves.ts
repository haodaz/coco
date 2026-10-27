import { clarityOf } from "./memory";
import { packFor } from "./species";
import type { Pet, State } from "./types";

// The standard set of moves every pet's character has, whatever the species. Each move is a mood: a few frames
// drawn from the pet's own character design (src/lib/character.ts) that loop like a GIF.
// A new pet starts simple; moves unlock as the AI's memory of the pet grows (clarity level), so the more moments
// the owner shares, the more alive the pet becomes. Shared by the server (what to draw) and the app (what to show).

export type MoveMood = "idle" | "happy" | "thinking" | "busy" | "confused" | "close" | "rest";

export const MOVES: { mood: MoveMood; name: string; when: string; level: number }[] = [
  { mood: "idle", name: "Being there", when: "Always", level: 0 },
  { mood: "happy", name: "Happy wiggle", when: "When you tap me, or there's good news", level: 0 },
  { mood: "thinking", name: "Remembering", when: "While I look back for an answer", level: 1 },
  { mood: "busy", name: "Going through our cards", when: "When I search our moments", level: 2 },
  { mood: "confused", name: "Head tilt", when: "When I haven't seen something yet", level: 2 },
  { mood: "close", name: "Leaning in", when: "When we talk about us", level: 3 },
  { mood: "rest", name: "Dozing", when: "When you've been quiet for a while", level: 3 },
];

export const unlockedMoods = (level: number) => MOVES.filter((m) => level >= m.level).map((m) => m.mood);
export const moveOf = (mood: string) => MOVES.find((m) => m.mood === mood);

// Move cards: each move the pet has learned is also a Special card in the collection. "Being there" is the pet itself,
// not a card. Finishing the Starter Kit always gives the first one (Happy wiggle); every move learned after that, as
// the owner teaches the pet with more moments and their own words, gives another.
export const MOVE_CARDS = MOVES.filter((m) => m.mood !== "idle");
export const STARTER_MOVE: MoveMood = "happy";
export type MoveCard = { mood: MoveMood; at: string; from: "starter" | "taught" };

export function moveCards(pet: Pet, state: State): MoveCard[] {
  const slots = packFor(pet.species).quest;
  const quest = state.cards.filter((c) => c.petId === pet.id && c.kind === "quest");
  const complete = slots.every((s) => quest.some((c) => c.slotId === s.id));
  const owned: MoveCard[] = [];
  if (complete) owned.push({ mood: STARTER_MOVE, at: quest.reduce((a, c) => (c.createdAt > a ? c.createdAt : a), ""), from: "starter" });
  const level = clarityOf(state, pet).level;
  for (const m of MOVE_CARDS) {
    if (m.mood === STARTER_MOVE || level < m.level) continue;
    const u = pet.unlocks?.find((x) => x.mood === m.mood);
    owned.push({ mood: m.mood, at: u?.at ?? pet.character?.at ?? pet.createdAt, from: "taught" });
  }
  return owned;
}
