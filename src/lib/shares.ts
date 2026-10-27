import { randomBytes } from "node:crypto";
import { petContext } from "./ask";
import { runAs } from "./session";
import { load } from "./store";
import { adminClient, HOSTED } from "./supabase";
import type { Card, Pet, Share, State } from "./types";
import { packFor } from "./species";

// Links an owner hands out (a sitter's handover, a playdate invite). The link lives in the owner's own state;
// opening it finds that owner, and everything after runs as the owner, limited to the topics they chose.

export const newToken = () => randomBytes(12).toString("base64url");

export type Opened = { ownerId: string; state: State; share: Share; pet: Pet };

export async function openShare(token: string, kind: Share["kind"]): Promise<Opened | null> {
  if (!/^[\w-]{12,40}$/.test(token)) return null;
  let ownerId = "local";
  if (HOSTED) {
    const { data } = await adminClient().from("app_state").select("user_id").contains("state", { shares: [{ token }] }).maybeSingle();
    if (!data) return null;
    ownerId = data.user_id;
  }
  const state = await runAs(ownerId, load);
  const share = state.shares?.find((s) => s.token === token && s.kind === kind && !s.revokedAt);
  const pet = share && state.pets.find((p) => p.id === share.petId);
  return share && pet ? { ownerId, state, share, pet } : null;
}

// The cards a link may show and talk about: only the kinds of moment the owner chose.
export function sharedCards(state: State, pet: Pet, share: Share): Card[] {
  const slots = packFor(pet.species).quest;
  const patternOf = (c: Card) => c.pattern ?? slots.find((s) => s.id === c.slotId)?.pattern ?? null;
  return state.cards.filter((c) => c.petId === pet.id && c.kind !== "legendary" && share.topics.includes(patternOf(c) as never));
}

// The pet's context for a link: its profile and only the shared imprints, nothing else.
export function sharedContext(o: Opened) {
  const allowed = new Set(sharedCards(o.state, o.pet, o.share).map((c) => c.id));
  const full = petContext(o.state, o.pet);
  return {
    ...full,
    cards: full.cards.filter((c) => allowed.has(c.id)),
    imprints: full.imprints.filter((i) => allowed.has(i.id)),
    senses: full.senses,
  };
}

// Files a link may serve: the character's frames and the shared cards' paintings, nothing else.
export function sharedFiles(o: Opened) {
  const files = new Set<string>();
  for (const frames of Object.values(o.pet.character?.moods ?? {})) for (const f of frames) files.add(f);
  for (const c of sharedCards(o.state, o.pet, o.share)) for (const u of [c.art, c.fg]) if (u) files.add(u.replace("/api/art/", "").replace(/\?.*$/, ""));
  return files;
}
