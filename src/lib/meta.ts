import type { QuestSlot } from "./species";
import type { Species, TraceKind } from "./types";

// The only place that talks to the Meta Model API.
// MOCK mode is the default until the hackathon credits arrive: no request leaves the machine and nothing is billed.
// Set META_LIVE=1 in .env.local to call the real API.

export const LIVE = process.env.META_LIVE === "1";

export type Identification = {
  species: Species;
  breedCandidates: { name: string; confidence: number }[];
  coat: string | null;
  marks: string | null;
  size: string | null;
};

export type PhotoReading = {
  traces: { kind: TraceKind; label: string; detail: string | null }[];
  cardName: string;
  line: string; // in the pet's voice, only about what the photo shows
  observation: string;
  rarity: 1 | 2 | 3;
};

// Step 1 of onboarding: what animal is this? Appearance only, never health.
export async function identify(_imageB64: string): Promise<Identification> {
  if (!LIVE) {
    return {
      species: "dog",
      breedCandidates: [
        { name: "Labrador Retriever", confidence: 0.82 },
        { name: "Labrador mix", confidence: 0.14 },
      ],
      coat: "short, glossy, solid black",
      marks: "amber-brown eyes; a small lighter patch on the chest",
      size: "large",
    };
  }
  throw new Error("Live identify: wire up once the API format is checked against the docs");
}

// One quest photo → traces + a card. The pet's line may only describe what the photo shows.
export async function readQuestPhoto(_imageB64: string, slot: QuestSlot, petName: string): Promise<PhotoReading> {
  if (!LIVE) return mockReading(slot, petName);
  throw new Error("Live readQuestPhoto: wire up once the API format is checked against the docs");
}

const MOCK: Record<string, Omit<PhotoReading, "rarity">> = {
  moon: { traces: [{ kind: "activity", label: "sleeping", detail: null }, { kind: "place", label: "sofa", detail: null }], cardName: "Keeper of the Soft Spot", line: "This is my place. Wake me for snacks only.", observation: "Sleeps stretched out on a soft spot." },
  bowl: { traces: [{ kind: "activity", label: "eating", detail: null }], cardName: "Bowl Devotee", line: "I heard the bag. I'm already here.", observation: "Comes running at mealtime." },
  ball: { traces: [{ kind: "activity", label: "playing", detail: null }, { kind: "object", label: "toy", detail: null }], cardName: "Fetch Captain", line: "Throw it again. And again.", observation: "Plays with a favourite toy." },
  hearts: { traces: [{ kind: "companion", label: "owner", detail: null }], cardName: "Shadow of My Human", line: "Wherever you sit is where I sit.", observation: "Stays close to the owner." },
  path: { traces: [{ kind: "activity", label: "walking", detail: null }, { kind: "place", label: "outside", detail: null }], cardName: "Trail Sniffer", line: "Every corner has news.", observation: "Takes walks outside." },
  wind: { traces: [{ kind: "place", label: "car", detail: null }], cardName: "Passenger Seat Royalty", line: "Window down, ears up.", observation: "Rides in the car." },
  circles: { traces: [{ kind: "companion", label: "other animals or people", detail: null }], cardName: "Friendly Ambassador", line: "New friend? Let me check you first.", observation: "Meets others." },
  mystery: { traces: [{ kind: "activity", label: "a quirk", detail: null }], cardName: "The Mystery Habit", line: "You don't need to understand. Just admire.", observation: "A habit only this pet has." },
};

function mockReading(slot: QuestSlot, petName: string): PhotoReading {
  const m = MOCK[slot.pattern] ?? MOCK.mystery;
  return { ...m, line: m.line.replace("{name}", petName), rarity: slot.pattern === "mystery" ? 3 : slot.pattern === "hearts" ? 2 : 1 };
}
