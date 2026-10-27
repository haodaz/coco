import type { Species } from "./types";

// Each species is data, not code: its photo quest (with card-back patterns) and, later, its care calendar.
// Quest slots ask for photos the owner already has — animals do not pose on request.

export type Pattern = "moon" | "bowl" | "ball" | "hearts" | "path" | "wind" | "circles" | "mystery" | "leaf" | "sun" | "waves" | "nest";

export type QuestSlot = {
  id: string;
  title: string; // what to look for in the album
  why: string; // what it tells us
  pattern: Pattern;
  style: string; // art style for the card this slot produces
  minRarity: 1 | 2 | 3; // the model rates each photo; a few slots are special enough to have a floor
};

export type SpeciesPack = { species: Species; label: string; quest: QuestSlot[] };

const slot = (id: string, title: string, why: string, pattern: Pattern, style: string, minRarity: 1 | 2 | 3 = 1): QuestSlot => ({ id, title, why, pattern, style, minRarity });

const DOG: QuestSlot[] = [
  slot("sleep-1", "Sleeping", "favourite spots and routine", "moon", "night watercolour"),
  slot("sleep-2", "Sleeping somewhere else", "a second favourite spot", "moon", "night watercolour"),
  slot("eat", "Eating or getting a treat", "how it eats, what it loves", "bowl", "warm gouache"),
  slot("play", "With a toy, or playing", "what it plays with", "ball", "bright playful cartoon"),
  slot("you-1", "With you", "how close it stays to you", "hearts", "soft pastel", 2),
  slot("you-2", "With you, another moment", "the relationship, again", "hearts", "soft pastel"),
  slot("walk", "Out on a walk", "usual places, mood outside", "path", "picture book"),
  slot("car", "In the car or a carrier", "travel habits", "wind", "retro poster"),
  slot("social", "With other people or animals", "its social side", "circles", "comic panel", 2),
  slot("odd", "Its strangest habit", "what is only this pet", "mystery", "surreal collage", 3),
];

const CAT: QuestSlot[] = [
  slot("sleep-1", "Sleeping", "favourite spots and routine", "moon", "night watercolour"),
  slot("sleep-2", "Curled up somewhere else", "a second favourite spot", "moon", "night watercolour"),
  slot("eat", "Eating or getting a treat", "how it eats, what it loves", "bowl", "warm gouache"),
  slot("play", "Playing or hunting a toy", "what it plays with", "ball", "bright playful cartoon"),
  slot("you", "With you", "how close it stays to you", "hearts", "soft pastel", 2),
  slot("perch", "At a window or up high", "its lookout", "sun", "ukiyo-e"),
  slot("hide", "Hiding spot", "where it goes to be alone", "mystery", "noir ink", 2),
  slot("groom", "Grooming", "its routine", "leaf", "botanical print"),
  slot("social", "With other people or animals", "its social side", "circles", "comic panel"),
  slot("odd", "Its strangest habit", "what is only this pet", "mystery", "surreal collage", 3),
];

const GENERIC = (habitat: string): QuestSlot[] => [
  slot("home", `Its ${habitat}, whole`, "its world", "nest", "diorama"),
  slot("rest", "Resting", "favourite spots and routine", "moon", "night watercolour"),
  slot("eat", "Eating", "how it eats, what it loves", "bowl", "warm gouache"),
  slot("active", "Most active moment", "how it moves", "waves", "bright playful cartoon"),
  slot("you", "With you", "how it reacts to you", "hearts", "soft pastel", 2),
  slot("close", "Close-up", "the details that make it itself", "leaf", "botanical print"),
  slot("odd", "Its strangest habit", "what is only this pet", "mystery", "surreal collage", 3),
];

export const PACKS: Record<Species, SpeciesPack> = {
  dog: { species: "dog", label: "Dog", quest: DOG },
  cat: { species: "cat", label: "Cat", quest: CAT },
  bird: { species: "bird", label: "Bird", quest: GENERIC("cage or perch") },
  reptile: { species: "reptile", label: "Reptile", quest: GENERIC("enclosure") },
  small_mammal: { species: "small_mammal", label: "Small mammal", quest: GENERIC("enclosure") },
  fish: { species: "fish", label: "Fish", quest: GENERIC("tank") },
  other: { species: "other", label: "Other", quest: GENERIC("home") },
};

export const packFor = (s: Species) => PACKS[s] ?? PACKS.other;
