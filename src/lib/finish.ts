import type { Card, Species } from "./types";

// How a card is finished, by rarity: common cards are matte, rare ones foil or holo,
// legends get stars or gold, and the legendary card of a full set steps out of its frame.
// Within a tier the finish is fixed by the card id, so the same card always looks the same.

export type Finish = "matte" | "foil" | "holo" | "cosmos" | "gold" | "popout";

export function finishFor(card: Pick<Card, "id" | "kind" | "rarity">): Finish {
  if (card.kind === "legendary") return "popout";
  const pick = [...card.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) % 2;
  if (card.rarity === 3) return pick ? "cosmos" : "gold";
  if (card.rarity === 2) return pick ? "foil" : "holo";
  return "matte";
}

// What SAM is asked to find in the art; it reads short everyday nouns best.
export function samPhrase(species: Species) {
  return species === "small_mammal" || species === "other" ? "animal" : species;
}
