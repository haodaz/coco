import type { Pattern } from "./species";
import type { Place } from "./place";
import type { Fact } from "./rules";
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
  // the pet as a game character: moods, each a short loop of frames (file names)
  character?: { style: string; moods: Record<string, string[]>; at: string } | null;
  unlocks?: { mood: string; at: string }[]; // moves learned after the first ones, as memories grew
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
  facesBlurred?: number; // people's faces blurred on this machine before anything else saw the photo
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
  pattern?: Pattern | null; // the kind of moment, for cards outside the quest (daily packs)
  name: string; // "Window Guardian"
  rarity: 1 | 2 | 3;
  style: string; // art style used for this card
  art: string | null; // generated art file, null until generated
  note?: { text: string; via: "voice" | "text"; at: string } | null; // the owner's words about this moment
  fg?: string | null;
  basis?: string[]; // for the legendary card: the imprints its soul line rests on // the pet alone on a transparent layer the size of the art, for depth (rare cards and up)
  line: string; // in the pet's voice
  observation: string; // what this photo told us
  photoId: string;
  createdAt: string;
};

// A conversation with the pet, kept so the owner can come back to it (the sidebar's "Recent").
// Something the pet opens on the owner's screen while it answers (the conversation's side panel).
export type PetAction = {
  type: "show_cards" | "open_card" | "open_pack" | "add_photo" | "show_memory" | "make_link" | "show_place";
  cardIds: string[];
  topic: Pattern | null;
  slotId: string | null;
  kind: "sitter" | "playdate" | null;
};

export type ChatTurn = {
  action?: PetAction | null;
  question: string;
  answer: string;
  mood: string;
  basis: { cardId: string; how: string }[];
  general: string[];
  gap: { topic: string; suggest: string } | null;
  facts?: Fact[]; // what was checked about the place before answering (weather, rules), as cited
  at: string;
};
export type Thread = { id: string; petId: string; title: string; createdAt: string; updatedAt: string; turns: ChatTurn[]; via?: { kind: "sitter"; token: string } };

// A link the owner hands out. "sitter": someone looking after the pet talks with its twin before and during the stay.
// "playdate": another owner brings their pet, the two twins meet first. The owner chooses which kinds of moment it shares.
export type Share = { token: string; kind: "sitter" | "playdate"; petId: string; topics: Pattern[]; label: string; createdAt: string; revokedAt?: string | null };

// Two twins met (agent to agent) before their pets do; both owners keep the result.
export type Playdate = {
  id: string;
  petId: string; // this owner's pet
  other: { name: string; species: string; breed: string | null; face: string | null };
  transcript: { who: "me" | "them"; line: string; mood: string }[];
  report: PlayReport;
  at: string;
};
export type PlayReport = {
  verdict: "good match" | "worth a try" | "not yet" | "not enough to tell";
  summary: string;
  reasons: { pet: "me" | "them"; text: string; cardIds: string[] }[];
  cautions: string[];
  firstMeeting: string[];
};

export type State = {
  pets: Pet[];
  photos: Photo[];
  traces: Trace[];
  traits: Trait[];
  cards: Card[];
  threads?: Thread[];
  shares?: Share[];
  playdates?: Playdate[];
  place?: Place | null; // where the owner and the pet live, area-level
};
