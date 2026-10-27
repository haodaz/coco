import { seriesProgress } from "./series";
import type { Pet, State } from "./types";

// Memory Points: the owner teaches the pet by sharing memories and earns points; points open packs, and a pack
// turns shared memories into painted cards. Sharing is free and capped (3 a day); daily tasks ask for the moments
// the pet's AI knows least (the empty slots of its series), so the owner isn't chased for photos, and what is
// shared fills real gaps. Days are UTC so the server and the app agree.

export const SHARE_POINTS = 1;
export const FREE_PER_DAY = 3;
export const TASK_POINTS = 3;
export const TASKS_PER_DAY = 3;
export const PACK_COST = 3;
export const PACK_SIZE = 3;

export const today = (now = new Date()) => now.toISOString().slice(0, 10);
const entries = (state: State, petId: string) => (state.points ?? []).filter((p) => p.petId === petId);

export const balance = (state: State, petId: string) => entries(state, petId).reduce((n, p) => n + p.delta, 0);
export const sharesToday = (state: State, petId: string, now = new Date()) => entries(state, petId).filter((p) => p.why === "share" && p.at.slice(0, 10) === today(now)).length;
export const sealedPrints = (state: State, petId: string) => state.cards.filter((c) => c.petId === petId && c.sealed).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export type Task = { id: string; tag: string; label: string; hint: string; series: string; colour: string; done: boolean };

// today's tasks: picked from the empty slots of the pet's series (filled ones only if too few are empty),
// the same three all day, a new three tomorrow
export function tasksFor(state: State, pet: Pet, now = new Date()): Task[] {
  const day = today(now);
  const done = new Set(entries(state, pet.id).filter((p) => p.why === "task").map((p) => p.ref));
  const series = seriesProgress(state, pet, true);
  const slots = series.flatMap((s) => s.slots.map((x) => ({ ...x, series: s.name, colour: s.colour, empty: !x.card })));
  const unique = slots.filter((x, i) => slots.findIndex((y) => y.tag === x.tag) === i);
  const seed = [...`${day}${pet.id}`].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const shuffled = unique.map((x, i) => ({ x, k: (seed ^ (i * 2654435761)) >>> 0 })).sort((a, b) => a.k - b.k).map((o) => o.x);
  const pick = [...shuffled.filter((x) => x.empty), ...shuffled.filter((x) => !x.empty)].slice(0, TASKS_PER_DAY);
  return pick.map((x) => {
    const id = `${day}:${x.tag}`;
    return { id, tag: x.tag, label: x.label, hint: x.hint, series: x.series, colour: x.colour, done: done.has(id) };
  });
}
