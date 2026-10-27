import type { Card } from "./types";

// The daily rhythm, worked out in the owner's own time zone: today's pack, the streak of days with a new memory,
// and how long until the next pack.

export const PER_DAY = 3;
const day = (d: Date) => d.toLocaleDateString("en-CA");

export function rhythm(cards: Card[], now = new Date()) {
  const daily = cards.filter((c) => c.kind === "daily");
  const today = daily.filter((c) => day(new Date(c.createdAt)) === day(now));
  const days = new Set(daily.map((c) => day(new Date(c.createdAt))));
  // a streak counts back from today, or from yesterday if today's pack is still waiting
  let streak = 0;
  const d = new Date(now);
  if (!days.has(day(d))) d.setDate(d.getDate() - 1);
  while (days.has(day(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight.getTime() - now.getTime();
  return { today, left: Math.max(0, PER_DAY - today.length), streak, nextPackIn: `${Math.floor(ms / 3.6e6)}h ${Math.floor((ms % 3.6e6) / 6e4)}m` };
}
