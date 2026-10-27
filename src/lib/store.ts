import { promises as fs } from "node:fs";
import path from "node:path";
import { currentUserId } from "./session";
import { adminClient, HOSTED } from "./supabase";
import type { State } from "./types";

// The signed-in user's state: one document (pets, photos, traces, cards).
// Hosted: a row in Supabase's app_state, saved only if nobody else saved in between (version check).
// Local (no Supabase keys): data/state.json and data/uploads, one local user.

const DATA = path.join(process.cwd(), "data");
const STATE = path.join(DATA, "state.json");
export const UPLOADS = path.join(DATA, "uploads");

const empty = (): State => ({ pets: [], photos: [], traces: [], traits: [], cards: [] });
const versions = new WeakMap<State, number>(); // the version each loaded state came from

export class Conflict extends Error {}

export async function load(): Promise<State> {
  if (!HOSTED) {
    try {
      return { ...empty(), ...JSON.parse(await fs.readFile(STATE, "utf8")) };
    } catch {
      return empty();
    }
  }
  const { data, error } = await adminClient().from("app_state").select("state, version").eq("user_id", currentUserId()).maybeSingle();
  if (error) throw new Error(`load state: ${error.message}`);
  const s = { ...empty(), ...(data?.state ?? {}) } as State;
  versions.set(s, data ? data.version : -1);
  return s;
}

export async function save(s: State) {
  if (!HOSTED) {
    await fs.mkdir(DATA, { recursive: true });
    await fs.writeFile(STATE, JSON.stringify(s, null, 1));
    return;
  }
  const db = adminClient().from("app_state");
  const user = currentUserId();
  const v = versions.get(s) ?? -1;
  if (v < 0) {
    const { error } = await db.insert({ user_id: user, state: s, version: 1 });
    if (error) throw error.code === "23505" ? new Conflict("someone saved first") : new Error(`save state: ${error.message}`);
    versions.set(s, 1);
    return;
  }
  const { data, error } = await db.update({ state: s, version: v + 1, updated_at: new Date().toISOString() }).eq("user_id", user).eq("version", v).select("version");
  if (error) throw new Error(`save state: ${error.message}`);
  if (!data?.length) throw new Conflict("the state changed while this request was working");
  versions.set(s, v + 1);
}

// Long jobs (painting, the character) load, work for a minute, then add their result to whatever the state is by then.
export async function update(apply: (s: State) => void) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const s = await load();
    apply(s);
    try {
      return await save(s);
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
    }
  }
  throw new Conflict("could not save after several tries");
}

export const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
