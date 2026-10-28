import { clarityOf } from "./memory";
import { packFor } from "./species";
import type { Pet, State } from "./types";

// The standard set of moves every pet's character has, whatever the species. Each move is a mood: a few frames
// drawn from the pet's own character design (src/lib/character.ts) that loop like a GIF.
// A new pet starts simple; moves unlock as the AI's memory of the pet grows (clarity level), so the more moments
// the owner shares, the more alive the pet becomes. Shared by the server (what to draw) and the app (what to show).

export type MoveMood = "idle" | "happy" | "thinking" | "busy" | "confused" | "close" | "rest" | "walk";

export const MOVES: { mood: MoveMood; name: string; when: string; level: number }[] = [
  { mood: "idle", name: "Being there", when: "Always", level: 0 },
  { mood: "happy", name: "Happy wiggle", when: "When you tap me, or there's good news", level: 0 },
  { mood: "thinking", name: "Remembering", when: "While I look back for an answer", level: 1 },
  { mood: "busy", name: "Going through our cards", when: "When I search our moments", level: 2 },
  { mood: "confused", name: "Head tilt", when: "When I haven't seen something yet", level: 2 },
  { mood: "close", name: "Leaning in", when: "When we talk about us", level: 3 },
  { mood: "rest", name: "Dozing", when: "When you've been quiet for a while", level: 3 },
  // walking is how the pet gets anywhere: every pet has it from the start, it is not a card
  { mood: "walk", name: "Trotting over", when: "When I come to see what you're looking at", level: 0 },
];

export const unlockedMoods = (level: number) => MOVES.filter((m) => level >= m.level).map((m) => m.mood);
export const moveOf = (mood: string) => MOVES.find((m) => m.mood === mood);

// Move cards: each move the pet learns becomes a Special card, but it has to be pulled: it drops as a bonus card
// out of a pack. Finishing the Starter Kit always drops the first one (Happy wiggle); after that, every move the pet
// has learned (as the owner teaches it with more moments and their own words) waits for the next pack.
// "Being there" is the pet itself, not a card.
export const MOVE_CARDS = MOVES.filter((m) => m.mood !== "idle" && m.mood !== "walk");
export const STARTER_MOVE: MoveMood = "happy";
export type MoveCard = { mood: string; at: string; from: "starter" | "pack" };

// when the Starter Kit was finished (all its slots filled), or null
export function starterDoneAt(pet: Pet, state: State): string | null {
  const slots = packFor(pet.species).quest;
  const quest = state.cards.filter((c) => c.petId === pet.id && c.kind === "quest");
  if (!slots.every((s) => quest.some((c) => c.slotId === s.id))) return null;
  return quest.reduce((a, c) => (c.createdAt > a ? c.createdAt : a), "");
}

export function moveCards(pet: Pet, state: State): MoveCard[] {
  const own: MoveCard[] = [...(pet.moveCards ?? [])];
  const done = starterDoneAt(pet, state);
  if (done && !own.some((m) => m.mood === STARTER_MOVE)) own.unshift({ mood: STARTER_MOVE, at: done, from: "starter" });
  return own;
}

// the move a pack would drop as its bonus card: learned (clarity), drawn, and not pulled yet
export function nextPull(pet: Pet, state: State): string | null {
  const level = clarityOf(state, pet).level;
  const have = moveCards(pet, state).map((m) => m.mood);
  return MOVE_CARDS.find((m) => m.mood !== STARTER_MOVE && level >= m.level && !have.includes(m.mood) && pet.character?.moods[m.mood]?.length)?.mood ?? null;
}

// moves the pet has learned whose cards are still waiting in a pack
export const waitingMoves = (pet: Pet, state: State) => {
  const level = clarityOf(state, pet).level;
  const have = moveCards(pet, state).map((m) => m.mood);
  return MOVE_CARDS.filter((m) => m.mood !== STARTER_MOVE && level >= m.level && !have.includes(m.mood));
};
