// The pet's world, in four layers: photos and notes (raw material) → traces (what it did)
// → traits (who it is, each with evidence) → cards (what the owner gets back).

export type Species = "dog" | "cat" | "bird" | "reptile" | "small_mammal" | "fish" | "other";
export type Credential = "none" | "service" | "esa" | "therapy" | "unknown";

export type Pet = {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  breedCandidates: { name: string; confidence: number }[];
  appearance: { coat: string | null; marks: string | null; size: string | null };
  born: string | null; // YYYY-MM-DD or YYYY-MM
  sex: "female" | "male" | null;
  credential: Credential;
  avatarPhotoId: string | null;
  // the AI's own picture of the pet, repainted each time clarity rises; shown pixelated to match the level
  likeness?: { file: string; level: number; from: "profile" | "imprints"; at: string } | null;
  createdAt: string;
};

export type Photo = {
  id: string;
  petId: string;
  file: string; // stored JPEG under data/uploads
  originalName: string;
  takenAt: string | null; // from the file when we can read it
  uploadedAt: string;
  slotId: string | null; // which quest slot it filled, if any
};

// One observation from a photo or a note, always with its source.
export type TraceKind = "place" | "activity" | "companion" | "object" | "time" | "note";
export type Trace = {
  id: string;
  petId: string;
  kind: TraceKind;
  label: string; // "window sofa", "sleeping", "owner"
  detail: string | null;
  source: { type: "photo"; photoId: string } | { type: "note"; noteId: string } | { type: "owner" };
  at: string | null;
};

export type TraitCategory = "likes" | "habits" | "skills" | "relationships" | "reactions" | "places";
export type Trait = {
  id: string;
  petId: string;
  category: TraitCategory;
  statement: string; // "Loves the window sofa"
  evidence: string[]; // trace ids
  confidence: "maybe" | "likely" | "sure";
  ownerConfirmed: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type CardKind = "quest" | "daily" | "legendary";
export type Card = {
  id: string;
  petId: string;
  kind: CardKind;
  slotId: string | null;
  name: string; // "Window Guardian"
  rarity: 1 | 2 | 3;
  style: string; // art style used for this card
  art: string | null; // generated art file, null until generated
  note?: { text: string; via: "voice" | "text"; at: string } | null; // the owner's words about this moment
  fg?: string | null; // the pet alone on a transparent layer the size of the art, for depth (rare cards and up)
  line: string; // in the pet's voice
  observation: string; // what this photo told us
  photoId: string;
  createdAt: string;
};

export type State = {
  pets: Pet[];
  photos: Photo[];
  traces: Trace[];
  traits: Trait[];
  cards: Card[];
};
