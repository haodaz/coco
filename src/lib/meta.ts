import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { QuestSlot } from "./species";
import { UPLOADS, newId } from "./store";
import type { Species, TraceKind } from "./types";

// The only place that talks to the Meta Model API.
// MOCK mode is the default until the hackathon credits arrive: no request leaves the machine and nothing is billed.
// Set META_LIVE=1 in .env.local to call the real API.

export const LIVE = process.env.META_LIVE === "1";
const BASE = process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1";
const SPARK = "muse-spark-1.3";
const IMAGE = "muse-image-1.0";

// Every live call is logged with its token usage to data/usage.jsonl, so cost per feature stays visible.
async function logUsage(feature: string, model: string, ms: number, usage: unknown) {
  const line = JSON.stringify({ at: new Date().toISOString(), feature, model, ms, usage }) + "\n";
  await fs.appendFile(path.join(UPLOADS, "..", "usage.jsonl"), line).catch(() => {});
}

async function post(route: string, body: unknown) {
  const res = await fetch(`${BASE}${route}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.META_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Meta API ${route} ${res.status}: ${JSON.stringify(json)?.slice(0, 300)}`);
  return json;
}

// Muse Spark with one image and a JSON schema; returns the parsed object.
async function sparkJson<T>(feature: string, system: string, prompt: string, imageB64: string, name: string, schema: object): Promise<T> {
  const t0 = Date.now();
  const j = await post("/chat/completions", {
    model: SPARK,
    max_tokens: 3000, // reasoning tokens count toward this, so leave room
    messages: [
      { role: "system", content: system },
      { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }] },
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
  });
  await logUsage(feature, SPARK, Date.now() - t0, j.usage);
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Meta API ${feature}: empty answer (finish_reason ${j.choices?.[0]?.finish_reason})`);
  return JSON.parse(content) as T;
}

// Smaller copy for the model: enough detail, fewer image tokens.
async function forModel(imageB64: string) {
  return (await sharp(Buffer.from(imageB64, "base64")).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString("base64");
}

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
export async function identify(imageB64: string): Promise<Identification> {
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
  return sparkJson<Identification>(
    "identify",
    "You identify a pet from one photo. Describe appearance only: species, up to three breed guesses with confidence 0-1 (together at most 1; say 'mixed' or 'unknown' honestly), coat, distinctive marks, size. Never judge health, weight or condition.",
    "Who is this animal?",
    await forModel(imageB64),
    "identification",
    {
      type: "object",
      additionalProperties: false,
      required: ["species", "breedCandidates", "coat", "marks", "size"],
      properties: {
        species: { type: "string", enum: ["dog", "cat", "bird", "reptile", "small_mammal", "fish", "other"] },
        breedCandidates: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "confidence"], properties: { name: { type: "string" }, confidence: { type: "number" } } } },
        coat: { type: ["string", "null"] },
        marks: { type: ["string", "null"] },
        size: { type: ["string", "null"] },
      },
    },
  );
}

// One quest photo → traces + a card. The pet's line may only describe what the photo shows.
export async function readQuestPhoto(imageB64: string, slot: QuestSlot, petName: string): Promise<PhotoReading> {
  if (!LIVE) return mockReading(slot, petName);
  const r = await sparkJson<PhotoReading>(
    "quest-photo",
    [
      `You read one photo of a pet called ${petName} for a collectible card. The card slot is "${slot.title}": ${slot.why}`,
      "Traces: only things visible in the photo (place, activity, companion, object, time of day). Never guess what is not shown. Do not describe people's faces or identities; a person is just 'owner' or 'a person'.",
      `cardName: a short, warm title (2-5 words). line: one or two short sentences in ${petName}'s own first-person voice, plain everyday words, about this moment only. observation: one plain sentence in third person of what the photo shows.`,
      "rarity: 1 ordinary moment, 2 a moment with real character, 3 something truly unusual. Most photos are 1.",
      "Never mention health, weight, food amounts, medicine or training advice. No exclamation marks.",
    ].join("\n"),
    "Read this photo.",
    await forModel(imageB64),
    "photo_reading",
    {
      type: "object",
      additionalProperties: false,
      required: ["traces", "cardName", "line", "observation", "rarity"],
      properties: {
        traces: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "label", "detail"],
            properties: { kind: { type: "string", enum: ["place", "activity", "companion", "object", "time", "note"] }, label: { type: "string" }, detail: { type: ["string", "null"] } },
          },
        },
        cardName: { type: "string" },
        line: { type: "string" },
        observation: { type: "string" },
        rarity: { type: "integer", enum: [1, 2, 3] },
      },
    },
  );
  return { ...r, rarity: ([1, 2, 3] as const).includes(r.rarity) ? r.rarity : 1 };
}

// Card art: Muse Image repaints the photo in the slot's style, keeping the pet recognisable.
// Returns the stored file name, or null in practice mode (the card then shows the photo itself).
export async function paintCard(imageB64: string, style: string, species: string): Promise<string | null> {
  if (!LIVE) return null;
  const t0 = Date.now();
  const j = await post("/images/edits", {
    model: IMAGE,
    n: 1,
    prompt: `Repaint this exact ${species} as a collectible trading-card illustration in ${style}. Keep its exact face, ear shape, eye colour, coat colour and markings, and body proportions. Simple background in the same style. Leave out any people. No text, no frame, no border.`,
    images: [{ image_url: `data:image/jpeg;base64,${await forModel(imageB64)}` }],
  });
  await logUsage("card-art", IMAGE, Date.now() - t0, j.usage);
  const d = j.data?.[0];
  const raw = d?.b64_json ? Buffer.from(d.b64_json, "base64") : d?.url ? Buffer.from(await (await fetch(d.url)).arrayBuffer()) : null;
  if (!raw) throw new Error("Meta API card-art: no image returned");
  const name = `${newId("art")}.jpg`;
  await fs.mkdir(UPLOADS, { recursive: true });
  await fs.writeFile(path.join(UPLOADS, name), await sharp(raw).resize({ width: 900, height: 900, fit: "inside" }).jpeg({ quality: 88 }).toBuffer());
  return name;
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
