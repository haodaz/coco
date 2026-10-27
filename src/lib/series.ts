import { packFor, type Pattern } from "./species";
import type { Card, Pet, State } from "./types";

// Themed series to collect over time, by who the pet is: favourite things, food, games, friends, places, seasons,
// the hours of a day. They have nothing to do with which pack a card came from. A card carries several tags, read
// from what is already known about its moment (the kind of moment, what the photo showed, the owner's words, the
// day and hour it was taken), so one card can count in more than one series. Seasons take a year to fill.

export type Tag = { id: string; label: string };
type Ctx = { text: string; pattern: Pattern | null; month: number | null; hour: number | null; south: boolean };

const has = (text: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(text));

const TAGS: (Tag & { test: (c: Ctx) => boolean })[] = [
  { id: "toy", label: "A favourite toy", test: (c) => has(c.text, ["toy", "plush", "stuffed", "squeak"]) },
  { id: "spot", label: "A favourite spot", test: (c) => c.pattern === "sun" || has(c.text, ["window", "lookout", "porch", "balcony"]) },
  { id: "nap", label: "A favourite nap", test: (c) => c.pattern === "moon" || has(c.text, ["sleep", "nap", "asleep", "doz", "rest", "bed", "blanket"]) },
  { id: "you", label: "With you", test: (c) => c.pattern === "hearts" || has(c.text, ["owner", "my person", "cuddl", "lap", "hug"]) },
  { id: "meal", label: "Mealtime", test: (c) => c.pattern === "bowl" || has(c.text, ["bowl", "meal", "dinner", "breakfast", "kibble", "eat"]) },
  { id: "treat", label: "A treat", test: (c) => has(c.text, ["treat", "snack", "bone", "chew", "cookie", "cheese", "biscuit"]) },
  { id: "drink", label: "A drink", test: (c) => has(c.text, ["drink", "lapping", "water bowl", "sip"]) },
  { id: "ball", label: "Ball", test: (c) => has(c.text, ["ball", "fetch", "frisbee"]) },
  { id: "tug", label: "Tug", test: (c) => has(c.text, ["rope", "tug"]) },
  { id: "run", label: "Running", test: (c) => has(c.text, ["run", "chase", "zoom", "sprint", "jump", "leap"]) },
  { id: "animal", label: "Another animal", test: (c) => c.pattern === "circles" || has(c.text, ["another dog", "other dog", "dogs", "puppy", "cat", "kitten", "bird", "friend"]) },
  { id: "people", label: "Other people", test: (c) => has(c.text, ["child", "kid", "family", "friends", "people", "a person", "visitor"]) },
  { id: "home", label: "At home", test: (c) => c.pattern === "nest" || has(c.text, ["home", "sofa", "couch", "living room", "kitchen", "indoors", "floor"]) },
  { id: "outdoors", label: "Outdoors", test: (c) => c.pattern === "path" || has(c.text, ["park", "grass", "yard", "garden", "trail", "field", "woods", "walk"]) },
  { id: "water", label: "By the water", test: (c) => has(c.text, ["beach", "lake", "river", "sea", "ocean", "pool", "swim", "waves", "bench by water"]) },
  { id: "road", label: "On the road", test: (c) => c.pattern === "wind" || has(c.text, ["car", "trip", "travel", "road", "seat"]) },
  // seasons by the month the photo was taken (flipped south of the equator)
  ...(["spring", "summer", "autumn", "winter"] as const).map((season, i) => ({
    id: season,
    label: season[0].toUpperCase() + season.slice(1),
    test: (c: Ctx) => {
      if (c.month == null) return false;
      const m = c.south ? ((c.month + 5) % 12) + 1 : c.month;
      return [[3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 1, 2]][i].includes(m);
    },
  })),
  // the hours of a day, by when the photo was taken
  ...([["morning", "Morning", 5, 11], ["afternoon", "Afternoon", 11, 17], ["evening", "Evening", 17, 21], ["night", "Night", 21, 29]] as const).map(([id, label, a, b]) => ({
    id,
    label,
    test: (c: Ctx) => c.hour != null && ((c.hour >= a && c.hour < b) || (c.hour + 24 >= a && c.hour + 24 < b)),
  })),
];

export type Series = { id: string; name: string; blurb: string; colour: string; slots: { tag: string; hint: string }[] };

export const SERIES: Series[] = [
  { id: "favourites", name: "Favourite Things", blurb: "What they love most.", colour: "#c2418f", slots: [{ tag: "toy", hint: "The toy of the moment" }, { tag: "spot", hint: "Where they keep watch" }, { tag: "nap", hint: "The best place to sleep" }, { tag: "you", hint: "Close to you" }] },
  { id: "food", name: "Food & Treats", blurb: "The best part of the day, some say.", colour: "#d9822b", slots: [{ tag: "meal", hint: "At the bowl" }, { tag: "treat", hint: "A treat, earned or not" }, { tag: "drink", hint: "A drink of water" }] },
  { id: "games", name: "Game Time", blurb: "How they play.", colour: "#2f8f6b", slots: [{ tag: "ball", hint: "A ball or a fetch" }, { tag: "tug", hint: "A rope, a tug" }, { tag: "run", hint: "Full speed" }] },
  { id: "friends", name: "Friends", blurb: "Who they spend time with.", colour: "#5b3fb0", slots: [{ tag: "you", hint: "You two" }, { tag: "animal", hint: "Another animal" }, { tag: "people", hint: "Other people" }] },
  { id: "places", name: "Places", blurb: "Their world, near and far.", colour: "#137a74", slots: [{ tag: "home", hint: "At home" }, { tag: "outdoors", hint: "Outside" }, { tag: "water", hint: "Near water" }, { tag: "road", hint: "Going somewhere" }] },
  { id: "seasons", name: "Four Seasons", blurb: "One moment from each season. Takes a year.", colour: "#2b3a8f", slots: [{ tag: "spring", hint: "Mar–May" }, { tag: "summer", hint: "Jun–Aug" }, { tag: "autumn", hint: "Sep–Nov" }, { tag: "winter", hint: "Dec–Feb" }] },
  { id: "clock", name: "Around the Clock", blurb: "A whole day together.", colour: "#8f3fb0", slots: [{ tag: "morning", hint: "5–11 am" }, { tag: "afternoon", hint: "11 am–5 pm" }, { tag: "evening", hint: "5–9 pm" }, { tag: "night", hint: "After 9 pm" }] },
];

export const tagLabel = (id: string) => TAGS.find((t) => t.id === id)?.label ?? id;

// every tag a card carries
export function cardTags(card: Card, state: State, pet: Pet): string[] {
  const photo = state.photos.find((p) => p.id === card.photoId);
  const traces = state.traces.filter((t) => (t.source.type === "photo" && t.source.photoId === card.photoId) || (t.source.type === "note" && t.source.noteId === card.id));
  const pattern = card.pattern ?? packFor(pet.species).quest.find((s) => s.id === card.slotId)?.pattern ?? null;
  const taken = photo?.takenAt ?? null;
  const ctx: Ctx = {
    text: [card.name, card.observation, card.note?.text ?? "", ...traces.map((t) => `${t.label} ${t.detail ?? ""}`)].join(" · ").toLowerCase(),
    pattern,
    month: taken ? Number(taken.slice(5, 7)) || null : null,
    hour: taken && taken.length >= 13 ? Number(taken.slice(11, 13)) : null,
    south: (state.place?.lat ?? 1) < 0,
  };
  return TAGS.filter((t) => t.test(ctx)).map((t) => t.id);
}

// each series with the card that fills each slot (the rarest, then the owner's favourite, then the earliest)
// (memories not opened into cards yet count only when asked: they fill a gap for the AI, not the collection)
export function seriesProgress(state: State, pet: Pet, withSealed = false) {
  const cards = state.cards.filter((c) => c.petId === pet.id && c.kind !== "legendary" && (withSealed || !c.sealed));
  const tagged = cards.map((c) => ({ card: c, tags: cardTags(c, state, pet) }));
  const rank = (a: Card, b: Card) => b.rarity - a.rarity || Number(!!b.starred) - Number(!!a.starred) || a.createdAt.localeCompare(b.createdAt);
  return SERIES.map((s) => {
    const slots = s.slots.map((slot) => ({ ...slot, label: tagLabel(slot.tag), card: tagged.filter((t) => t.tags.includes(slot.tag)).map((t) => t.card).sort(rank)[0] ?? null }));
    return { ...s, slots, filled: slots.filter((x) => x.card).length };
  });
}
