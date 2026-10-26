import { promises as fs } from "node:fs";
import path from "node:path";
import type { State } from "./types";

// Local JSON store under data/ (git-ignored). One file for the state, one folder for photos.
// Enough for the build; a hosted store comes with deployment.

const DATA = path.join(process.cwd(), "data");
const STATE = path.join(DATA, "state.json");
export const UPLOADS = path.join(DATA, "uploads");

const empty = (): State => ({ pets: [], photos: [], traces: [], traits: [], cards: [] });

export async function load(): Promise<State> {
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(STATE, "utf8")) };
  } catch {
    return empty();
  }
}

export async function save(s: State) {
  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(STATE, JSON.stringify(s, null, 1));
}

export const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
