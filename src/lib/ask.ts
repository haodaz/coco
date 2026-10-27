import { clarityOf } from "./memory";
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

export async function ask(state: State, pet: Pet, question: string): Promise<AskResult> {
  const slots = packFor(pet.species).quest;
  const clarity = clarityOf(state, pet);
  const cards = state.cards.filter((c) => c.petId === pet.id);
  const imprints = cards.map((c) => {
    const photo = state.photos.find((p) => p.id === c.photoId);
    const traces = state.traces.filter((t) => (t.source.type === "photo" && t.source.photoId === c.photoId) || (t.source.type === "note" && t.source.noteId === c.id));
    return {
      id: c.id,
      kind: slots.find((s) => s.id === c.slotId)?.title ?? c.kind,
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

  const answer = LIVE
    ? await askPet(question, profile, imprints, senses, slots.map((s) => s.title))
    : { answer: `I only know a little about myself so far. Show me more moments and I'll answer that properly.`, basis: [], general: [], gap: null };

  // keep only cards that exist; the model may not invent evidence
  const basis = answer.basis.filter((b) => cards.some((c) => c.id === b.cardId));
  return {
    ...answer,
    basis,
    cards: basis.map((b) => cards.find((c) => c.id === b.cardId)!).map((c) => ({ id: c.id, name: c.name, art: c.art, photoId: c.photoId })),
  };
}
