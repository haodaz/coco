import { clarityOf, SENSES } from "./memory";
import type { Pattern } from "./species";
import type { PetAction } from "./types";
import { LIVE, askPet, type Answer } from "./meta";
import { packFor } from "./species";
import type { Pet, State } from "./types";

// "Ask Coco": the twin answers from its imprints. Everything it says about itself must rest on a card;
// general knowledge about the species or breed is allowed but kept apart; with no imprints on a topic it says so.

export type AskResult = Answer & { cards: { id: string; name: string; art: string | null; photoId: string }[] };

function age(born: string | null) {
  if (!born) return null;
  const b = new Date(born), n = new Date();
  const months = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth() - (n.getDate() < b.getDate() ? 1 : 0);
  return months >= 24 ? `${Math.floor(months / 12)} years` : `${months} months`;
}

// What the pet knows: its profile and every imprint (what the photo showed, what the owner said, its traces).
// The legendary card is drawn from the imprints, so it is not an imprint itself.
export function petContext(state: State, pet: Pet) {
  const slots = packFor(pet.species).quest;
  const clarity = clarityOf(state, pet);
  const cards = state.cards.filter((c) => c.petId === pet.id && c.kind !== "legendary");
  const imprints = cards.map((c) => {
    const photo = state.photos.find((p) => p.id === c.photoId);
    const traces = state.traces.filter((t) => (t.source.type === "photo" && t.source.photoId === c.photoId) || (t.source.type === "note" && t.source.noteId === c.id));
    return {
      id: c.id,
      kind: slots.find((s) => s.id === c.slotId)?.title ?? (c.pattern ? SENSES[c.pattern] : c.kind),
      date: photo?.takenAt?.slice(0, 10) ?? null,
      seen: c.observation,
      ownerSaid: c.note?.text ?? null,
      traces: traces.map((t) => `${t.kind}: ${t.label}${t.detail ? ` (${t.detail})` : ""}${t.source.type === "note" ? " [owner]" : ""}`),
    };
  });
  const profile = {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    age: age(pet.born),
    looks: pet.appearance,
    // only said when the owner chose to tell; "unknown" stays out of the answer
    workingStatus: pet.credential === "unknown" ? null : pet.credential,
  };
  const senses = clarity.senses.map((s) => `${s.label}: ${s.imprints ? `${s.imprints} imprint(s)` : "no imprints yet"}`);
  return { slots, cards, imprints, profile, senses };
}

export async function ask(state: State, pet: Pet, question: string, opts: { context?: ReturnType<typeof petContext>; audience?: "owner" | "sitter" } = {}): Promise<AskResult> {
  const { slots, cards, imprints, profile, senses } = opts.context ?? petContext(state, pet);

  const owner = (opts.audience ?? "owner") === "owner";
  const patterns = [...new Set(slots.map((s) => s.pattern))];
  const emptySlots = slots.filter((s) => !state.cards.some((c) => c.petId === pet.id && c.slotId === s.id));
  const tools = owner ? { topics: patterns.map((p) => ({ pattern: p, label: SENSES[p] })), emptySlots: emptySlots.map((s) => ({ id: s.id, title: s.title })) } : null;
  const answer = LIVE
    ? await askPet(question, profile, imprints, senses, slots.map((s) => s.title), opts.audience, tools)
    : { answer: `I only know a little about myself so far. Show me more moments and I'll answer that properly.`, basis: [], general: [], gap: null, mood: "confused" as const, action: null };

  // the action must point at real things; a gap with no action still offers a way to add a photo
  let action: PetAction | null = owner ? answer.action : null;
  if (action) {
    action.cardIds = action.cardIds.filter((id) => cards.some((c) => c.id === id));
    if (action.topic && !patterns.includes(action.topic as Pattern)) action.topic = null;
    if (action.slotId && !emptySlots.some((s) => s.id === action!.slotId)) action.slotId = null;
    if (action.type === "open_card" && !action.cardIds.length) action = null;
    else if (action.type === "make_link" && action.kind !== "sitter" && action.kind !== "playdate") action.kind = "sitter";
  }
  if (owner && !action && answer.gap) action = { type: "add_photo", cardIds: [], topic: null, slotId: null, kind: null };
  answer.action = action;

  // keep only cards that exist; the model may not invent evidence
  const basis = answer.basis.filter((b) => cards.some((c) => c.id === b.cardId));
  return {
    ...answer,
    basis,
    cards: basis.map((b) => cards.find((c) => c.id === b.cardId)!).map((c) => ({ id: c.id, name: c.name, art: c.art, photoId: c.photoId })),
  };
}
