import type { State } from "./types";

// The daily booster pack: up to 3 photos a day, any moment, any date.
export const PER_DAY = 3;

const day = (d: Date) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD, server's local day

export const openedToday = (s: State, petId: string) =>
  s.cards.filter((c) => c.petId === petId && c.kind === "daily" && day(new Date(c.createdAt)) === day(new Date())).length;
