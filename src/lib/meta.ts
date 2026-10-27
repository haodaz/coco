import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Pattern, QuestSlot } from "./species";
import { getMedia, putMedia } from "./media";
import { currentUserId } from "./session";
import { newId, UPLOADS } from "./store";
import { adminClient, HOSTED } from "./supabase";
import type { Pet, PlayReport, Species, TraceKind } from "./types";

// The only place that talks to the Meta Model API.
// MOCK mode is the default until the hackathon credits arrive: no request leaves the machine and nothing is billed.
// Set META_LIVE=1 in .env.local to call the real API.

export const LIVE = process.env.META_LIVE === "1";
const BASE = process.env.META_API_BASE_URL ?? "https://api.meta.ai/v1";
const API_KEY = process.env.MODEL_API_KEY ?? process.env.META_API_KEY; // MODEL_API_KEY is the name Meta's docs use
const SPARK = "muse-spark-1.3";
const IMAGE = "muse-image-1.0";

// Every live call is logged with its token usage (Supabase usage_log, or data/usage.jsonl locally),
// so cost per feature stays visible and the daily budget can be checked.
async function logUsage(feature: string, model: string, ms: number, usage: unknown) {
  if (HOSTED) {
    await adminClient().from("usage_log").insert({ user_id: currentUserId(), feature, model, ms, usage }).then(() => {}, () => {});
    return;
  }
  const line = JSON.stringify({ at: new Date().toISOString(), feature, model, ms, usage }) + "\n";
  await fs.appendFile(path.join(UPLOADS, "..", "usage.jsonl"), line).catch(() => {});
}

async function post(route: string, body: unknown) {
  const res = await fetch(`${BASE}${route}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Meta API ${route} ${res.status}: ${JSON.stringify(json)?.slice(0, 300)}`);
  return json;
}

// Muse Spark with an optional image and a JSON schema; returns the parsed object.
async function sparkJson<T>(feature: string, system: string, prompt: string, imageB64: string | string[] | null, name: string, schema: object, budget = 6000): Promise<T> {
  const t0 = Date.now();
  const j = await post("/chat/completions", {
    model: SPARK,
    max_tokens: budget, // reasoning tokens count toward this, so leave room
    messages: [
      { role: "system", content: system },
      { role: "user", content: imageB64 ? [{ type: "text", text: prompt }, ...[imageB64].flat().map((b) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b}` } }))] : prompt },
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
  });
  await logUsage(feature, SPARK, Date.now() - t0, j.usage);
  const content = j.choices?.[0]?.message?.content;
  // the model thought too long and the answer was cut off: once more with a bigger budget
  if (j.choices?.[0]?.finish_reason === "length" && budget < 16000) return sparkJson<T>(feature, system, prompt, imageB64, name, schema, 16000);
  if (!content) throw new Error(`Meta API ${feature}: empty answer (finish_reason ${j.choices?.[0]?.finish_reason})`);
  return JSON.parse(content) as T;
}

// When a photo may hold more than one animal, a reference photo of the pet goes along so the model knows which one it is.
const refLine = (petName: string) =>
  `If a second image is given, it is a reference photo of ${petName}. Other animals may be in the photo; ${petName} is the one that matches the reference, the others are companions with their own looks.`;
const withRef = async (imageB64: string, refB64?: string | null) => (refB64 ? [await forModel(imageB64), await forModel(refB64)] : await forModel(imageB64));

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
export async function readQuestPhoto(imageB64: string, slot: QuestSlot, petName: string, sex: Pet["sex"] = null, refB64: string | null = null): Promise<PhotoReading> {
  const pronoun = sex === "female" ? "she/her" : sex === "male" ? "he/him" : "they/them";
  if (!LIVE) return mockReading(slot, petName);
  const r = await sparkJson<PhotoReading>(
    "quest-photo",
    [
      `You read one photo of a pet called ${petName} for a collectible card. The card slot is "${slot.title}": ${slot.why}`,
      refLine(petName),
      "Traces: only things visible in the photo (place, activity, companion, object, time of day). Never guess what is not shown. Do not describe people's faces or identities; a person is just 'owner' or 'a person'.",
      `cardName: a short, warm title (2-5 words). line: one or two short sentences in ${petName}'s own first-person voice, plain everyday words, about this moment only; one photo cannot show a habit, so never say always, usually or every time. observation: one plain sentence in third person of what the photo shows, calling the pet ${petName} (pronouns ${pronoun}), never 'the dog' or 'it'.`,
      "rarity: 1 ordinary moment, 2 a moment with real character, 3 something truly unusual. Most photos are 1.",
      "Never mention health, weight, food amounts, medicine or training advice. No exclamation marks.",
    ].join("\n"),
    "Read this photo.",
    await withRef(imageB64, refB64),
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
  const rated = ([1, 2, 3] as const).includes(r.rarity) ? r.rarity : 1;
  return { ...r, rarity: Math.max(rated, slot.minRarity) as 1 | 2 | 3 };
}

// Card art: Muse Image paints a new picture of the pet. The photo only teaches it what the pet looks like;
// pose, scene and framing are new, so the card is an artwork, not a filtered photo.
// Returns the stored file name, or null in practice mode (the card then shows the photo itself).
export async function paintCard(imageB64: string, pet: Pick<Pet, "species" | "breed" | "sex" | "appearance">, style: string, scene: string, refB64: string | null = null): Promise<string | null> {
  if (!LIVE) return null;
  const t0 = Date.now();
  const j = await post("/images/edits", {
    model: IMAGE,
    n: 1,
    prompt: [
      `Create a completely new artwork of this specific animal: ${describePet(pet)}.`,
      "Use the photo only to learn what it looks like; do not copy the photo's pose, background or framing.",
      refB64 ? "The second image is a reference photo of this animal, to tell it apart from any other animals in the scene; other animals keep their own looks." : "",
      `Scene: ${scene}. Style: ${style}.`,
      "Keep it recognisable: same coat, colours, markings, eye colour, ear shape and face. If the moment includes people, draw each one as a simple stylised cartoon figure with a plain friendly cartoon face of your own invention. Their faces in the photo are blurred on purpose for privacy: never draw the blur, never try to recover a real face. Otherwise no people. No text, no border.",
    ].join(" "),
    images: [await forModel(imageB64), ...(refB64 ? [await forModel(refB64)] : [])].map((b) => ({ image_url: `data:image/jpeg;base64,${b}` })),
  });
  await logUsage("card-art", IMAGE, Date.now() - t0, j.usage);
  const d = j.data?.[0];
  const raw = d?.b64_json ? Buffer.from(d.b64_json, "base64") : d?.url ? Buffer.from(await (await fetch(d.url)).arrayBuffer()) : null;
  if (!raw) throw new Error("Meta API card-art: no image returned");
  return putMedia(`${newId("art")}.jpg`, await sharp(raw).resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 88 }).toBuffer());
}

function describePet(pet: Pick<Pet, "species" | "breed" | "sex" | "appearance">) {
  const { coat, marks, size } = pet.appearance;
  return [pet.sex, pet.breed ?? pet.species].filter(Boolean).join(" ") + [coat && `coat: ${coat}`, marks && `marks: ${marks}`, size && `size: ${size}`].filter(Boolean).map((x) => `; ${x}`).join("");
}

// SAM 3.1: find the pet in an image by a short noun phrase ("dog", "black cat") and return its masks.
// The image must be at most 1024 px on its long side; mask coordinates are in that image's pixels.
async function samMasks(jpeg: Buffer, phrase: string, feature: string) {
  const { parseImageStream, recordsOfKind } = await import("@meta-sam/parser");
  const t0 = Date.now();
  const j = await post("/responses", {
    model: "sam-3.1",
    stream: false,
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: phrase }, { type: "input_image", image_url: `data:image/jpeg;base64,${jpeg.toString("base64")}` }] }],
  });
  await logUsage(feature, "sam-3.1", Date.now() - t0, j.usage);
  const text: string = j.output?.[0]?.content?.[0]?.text ?? "";
  async function* events() {
    yield { type: "response.output_text.delta" as const, item_id: "m", output_index: 0, content_index: 0, delta: text };
    yield { type: "response.output_text.done" as const, item_id: "m", output_index: 0, content_index: 0, text };
    yield { type: "response.completed" as const };
  }
  const parsed = parseImageStream(events());
  for await (const _ of parsed);
  return recordsOfKind((await parsed.finalResult).records, "mask");
}

// Paint each mask into one full-size alpha channel (0 or 255).
async function maskAlpha(masks: Awaited<ReturnType<typeof samMasks>>, width: number, height: number) {
  const { decodeMaskToRaster } = await import("@meta-sam/parser");
  const alpha = Buffer.alloc(width * height);
  for (const m of masks) {
    const raster = decodeMaskToRaster(m.mask); // row-major, mask.width × mask.height, placed at bounds.left/top
    const { width: mw, height: mh } = m.mask;
    for (let y = 0; y < mh; y++) {
      const py = m.bounds.top + y;
      if (py >= height) break;
      for (let x = 0; x < mw; x++) {
        const px = m.bounds.left + x;
        if (px < width && raster[y * mw + x]) alpha[py * width + px] = 255;
      }
    }
  }
  return alpha;
}

// Cut the pet out of a photo: a transparent PNG cropped to the pet, or null when nothing was found or in practice mode.
// Used for avatars; only the animal is kept, so people in the photo never leave this step.
export async function cutout(imageB64: string, phrase: string): Promise<Buffer | null> {
  if (!LIVE) return null;
  const small = Buffer.from(await forModel(imageB64), "base64");
  const masks = await samMasks(small, phrase, "cutout");
  if (!masks.length) return null;
  // the largest object is the pet in the photo; smaller hits are usually toys or reflections
  const m = [...masks].sort((a, b) => b.mask.width * b.mask.height - a.mask.width * a.mask.height)[0];
  const { width: w, height: h } = m.mask;
  const alpha = await maskAlpha([{ ...m, bounds: { ...m.bounds, left: 0, top: 0 } }], w, h);
  const rgb = await sharp(small).extract({ left: m.bounds.left, top: m.bounds.top, width: w, height: h }).removeAlpha().raw().toBuffer();
  return sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

// Depth layer for a card: the pet alone on a transparent PNG the same size as the art,
// so the card can move pet and background apart. Returns the stored file name, or null.
export async function depthLayer(artFile: string, phrase: string): Promise<string | null> {
  if (!LIVE) return null;
  const png = await petLayer(await getMedia(artFile), phrase, ["clothing", "toy"], "depth-layer");
  if (!png) return null;
  return putMedia(artFile.replace(/\?.*$/, "").replace(/\.jpg$/, "-fg.png"), png);
}

// The pet alone on a transparent PNG the same size as the image (at most 1024 px on its long side).
// Things near the pet (what it wears or holds, the cards it plays with) are kept with it, or the layer looks torn.
export async function petLayer(img: Buffer, phrase: string, extraPhrases: string[], feature: string): Promise<Buffer | null> {
  const { width, height } = await sharp(img).metadata();
  if (!width || !height) return null;
  const [pets, ...extras] = await Promise.all([phrase, ...extraPhrases].map((p) => samMasks(img, p, feature)));
  if (!pets.length) return null;
  const pad = 0.08;
  const near = (m: (typeof pets)[number]) =>
    pets.some((p) => {
      const w = p.bounds.right - p.bounds.left, h = p.bounds.bottom - p.bounds.top;
      return m.bounds.left < p.bounds.right + w * pad && m.bounds.right > p.bounds.left - w * pad && m.bounds.top < p.bounds.bottom + h * pad && m.bounds.bottom > p.bounds.top - h * pad;
    });
  const hard = await maskAlpha([...pets, ...extras.flat().filter(near)], width, height);
  // a slightly soft edge so the pet doesn't look cut with scissors
  const soft = await sharp(hard, { raw: { width, height, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  const rgb = await sharp(img).removeAlpha().raw().toBuffer();
  return sharp(rgb, { raw: { width, height, channels: 3 } }).joinChannel(soft, { raw: { width, height, channels: 1 } }).png().toBuffer();
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
  return { ...m, line: m.line.replace("{name}", petName), rarity: slot.minRarity };
}

// Muse Voice Transcribe: the owner's spoken note (WAV) to text.
export async function transcribe(wav: Buffer): Promise<string> {
  if (!LIVE) return "";
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding: "WAV", mode: "PUSH_TO_TALK" })], { type: "application/json" }));
  form.append("audio", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "note.wav");
  const t0 = Date.now();
  const res = await fetch(`${BASE}/asr/transcribe`, { method: "POST", headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" }, body: form });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Meta API transcribe ${res.status}: ${JSON.stringify(j)?.slice(0, 200)}`);
  await logUsage("transcribe", "muse-voice-transcribe-1.0", Date.now() - t0, { audioMs: j.audioDurationMs });
  return String(j.transcript ?? "").replace(/\.{3}$/, ".").trim();
}

export type NoteReading = {
  traces: { kind: TraceKind; label: string; detail: string | null }[];
  line: string;
};

// The owner's words about a card: what they add beyond the photo becomes traces marked as the owner's,
// and the pet's line is rewritten so it carries what the owner said matters.
export async function readOwnerNote(imageB64: string, card: { name: string; line: string; observation: string }, note: string, petName: string, sex: Pet["sex"]): Promise<NoteReading> {
  if (!LIVE) return { traces: [{ kind: "note", label: note.slice(0, 60), detail: null }], line: card.line };
  const pronoun = sex === "female" ? "she/her" : sex === "male" ? "he/him" : "they/them";
  return sparkJson<NoteReading>(
    "owner-note",
    [
      `The owner of a pet called ${petName} (${pronoun}) added a note about this photo. The owner knows the pet; their words outrank what the photo seems to show.`,
      `What the photo reading said: "${card.observation}". The card's line: "${card.line}".`,
      "traces: only facts the owner's note adds (habits, likes, people, places, times, how often, why). Keep the owner's own words where you can. Do not repeat what the photo already showed. Nothing about people's identities beyond their role (owner, a friend, a child).",
      `line: rewrite the card's line in ${petName}'s first-person voice, one or two short plain sentences, using what the owner said. No exclamation marks. Never mention health, food amounts, medicine or training advice.`,
    ].join("\n"),
    `Owner's note: "${note}"`,
    await forModel(imageB64),
    "note_reading",
    {
      type: "object",
      additionalProperties: false,
      required: ["traces", "line"],
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
        line: { type: "string" },
      },
    },
  );
}

// The AI's picture of the pet. With little memory it only has the profile, so it paints a typical animal of that breed;
// with imprints it paints from the pet's own photos and what it has learned. Returns the stored file name.
export async function paintLikeness(pet: Pick<Pet, "species" | "breed" | "sex" | "appearance">, refsB64: string[], learned: string[]): Promise<string | null> {
  if (!LIVE) return null;
  const pose = "a calm portrait, sitting, facing the viewer, head and body visible, plain soft background, painterly, no people, no text, no border";
  const t0 = Date.now();
  const j = refsB64.length
    ? await post("/images/edits", {
        model: IMAGE,
        n: 1,
        prompt: [
          `A portrait of this specific animal: ${describePet(pet)}.`,
          `The photos all show the same animal; learn its exact face, markings, colours and build from them.`,
          learned.length ? `Things known about it: ${learned.slice(0, 12).join("; ")}.` : "",
          `Draw ${pose}. Do not copy any one photo.`,
        ].join(" "),
        images: await Promise.all(refsB64.slice(0, 4).map(async (b) => ({ image_url: `data:image/jpeg;base64,${await forModel(b)}` }))),
      })
    : await post("/images/generations", { model: IMAGE, n: 1, prompt: `A typical ${describePet(pet)}: ${pose}.` });
  await logUsage(refsB64.length ? "likeness-imprints" : "likeness-profile", IMAGE, Date.now() - t0, j.usage);
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("Meta API likeness: no image returned");
  return putMedia(`${newId("art")}-likeness.jpg`, await sharp(Buffer.from(b64, "base64")).resize(768, 1024, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer());
}

export type Answer = {
  answer: string; // in the pet's first-person voice
  basis: { cardId: string; how: string }[]; // the imprints this answer rests on
  general: string[]; // general species or breed knowledge used, kept apart from what is known about this pet
  gap: { topic: string; suggest: string } | null; // what it doesn't know yet, and which card would teach it
  mood: "happy" | "close" | "confused" | "thinking"; // how the character looks while saying it
};

// The twin answers a question from the owner, in the pet's voice, resting only on its imprints.
export async function askPet(question: string, profile: object, imprints: object[], senses: string[], slotTitles: string[], audience: "owner" | "sitter" = "owner"): Promise<Answer> {
  const sitter = audience === "sitter"
    ? [
        "You are NOT talking with your owner now. You are talking with someone your owner trusts to look after you (a sitter or a boarding host). Call your owner \"my person\". Help them care for you well: your routines, places, likes, how you react to things, all from your imprints.",
        "Your owner only shared some kinds of moments with this person; for anything outside them, say your person hasn't shared that and they should ask your person.",
        "Feeding amounts, medicine, health, house rules, where keys or supplies are: never answer from memory; say kindly to ask your person directly.",
      ]
    : [];
  return sparkJson<Answer>(
    audience === "sitter" ? "ask-sitter" : "ask",
    [
      "You are the voice of one particular pet, answering in first person. Warm, plain, everyday words, short (one to four sentences). No exclamation marks. Never shame anyone.",
      ...sitter,
      "Answer in the language the owner used.",
      "Judge by deeds, not by guessing the heart: anything you say about yourself (your likes, habits, places, people, reactions) must rest on the imprints below. List each imprint you used in basis with its id and a few words on how it supports the answer.",
      "You may use general knowledge about your species or breed, but say it as general (\"Labradors usually…\", \"most dogs…\") and list it in general. Never present general knowledge as a memory of your own.",
      "If the imprints say nothing about the topic, say plainly that you haven't shown the owner that yet, and fill gap with the topic and which kind of photo would teach you (pick from the photo kinds listed). You may still add one helpful, safe general sentence (for example, most shops don't let dogs in). Otherwise gap is null.",
      "Health, symptoms, food amounts, medicine, vaccines or training methods: do not advise, do not guess, and never say how your body feels. Say kindly, in your own voice, that a vet is the one to ask before giving you anything, and stop there. For these questions gap is null and basis is empty.",
      "Never mention people's identities beyond their role. Never invent dates.",
      "Never suggest leaving you in a parked car: whether that is safe depends on today's weather, which you cannot see. If it comes up, say the owner should check the weather first, or take you home first.",
      "mood: close when the answer is about you and the owner, confused when there is a gap, thinking for the vet answer, happy otherwise.",
      "",
      `Profile: ${JSON.stringify(profile)}`,
      `Imprints (each is a card with a photo the owner shared): ${JSON.stringify(imprints)}`,
      `What the imprints cover: ${senses.join("; ")}`,
      `Photo kinds that teach you: ${slotTitles.join("; ")}`,
    ].join("\n"),
    question,
    null,
    "answer",
    {
      type: "object",
      additionalProperties: false,
      required: ["answer", "basis", "general", "gap", "mood"],
      properties: {
        answer: { type: "string" },
        basis: { type: "array", items: { type: "object", additionalProperties: false, required: ["cardId", "how"], properties: { cardId: { type: "string" }, how: { type: "string" } } } },
        general: { type: "array", items: { type: "string" } },
        mood: { type: "string", enum: ["happy", "close", "confused", "thinking"] },
        gap: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["topic", "suggest"], properties: { topic: { type: "string" }, suggest: { type: "string" } } }] },
      },
    },
  );
}

export type MomentReading = PhotoReading & { pattern: Pattern };

// A photo from a daily pack: no slot, so the model also says which kind of moment it is.
export async function readMomentPhoto(imageB64: string, kinds: { pattern: Pattern; label: string }[], petName: string, sex: Pet["sex"] = null, refB64: string | null = null): Promise<MomentReading> {
  if (!LIVE) {
    const pattern = kinds[Math.floor(Math.random() * kinds.length)].pattern;
    return { ...mockReading({ id: "daily", title: "", why: "", pattern, style: "", minRarity: 1 }, petName), pattern };
  }
  const pronoun = sex === "female" ? "she/her" : sex === "male" ? "he/him" : "they/them";
  return sparkJson<MomentReading>(
    "daily-photo",
    [
      `You read one photo of a pet called ${petName} for a collectible card.`,
      refLine(petName),
      `pattern: which kind of moment this is, one of: ${kinds.map((k) => `${k.pattern} (${k.label})`).join(", ")}.`,
      "Traces: only things visible in the photo (place, activity, companion, object, time of day). Never guess what is not shown. Do not describe people's faces or identities; a person is just 'owner' or 'a person'.",
      `cardName: a short, warm title (2-5 words). line: one or two short sentences in ${petName}'s own first-person voice, plain everyday words, about this moment only; one photo cannot show a habit, so never say always, usually or every time. observation: one plain sentence in third person of what the photo shows, calling the pet ${petName} (pronouns ${pronoun}), never 'the dog' or 'it'.`,
      "rarity: 1 ordinary moment, 2 a moment with real character, 3 something truly unusual. Most photos are 1.",
      "Never mention health, weight, food amounts, medicine or training advice. No exclamation marks.",
    ].join("\n"),
    "Read this photo.",
    await withRef(imageB64, refB64),
    "moment_reading",
    {
      type: "object",
      additionalProperties: false,
      required: ["pattern", "traces", "cardName", "line", "observation", "rarity"],
      properties: {
        pattern: { type: "string", enum: kinds.map((k) => k.pattern) },
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
}

// Muse Image edit with any number of reference images; returns the raw image.
export async function editImage(feature: string, prompt: string, imagesB64: string[]): Promise<Buffer> {
  const t0 = Date.now();
  const j = await post("/images/edits", { model: IMAGE, n: 1, prompt, images: imagesB64.slice(0, 4).map((b) => ({ image_url: `data:image/jpeg;base64,${b}` })) });
  await logUsage(feature, IMAGE, Date.now() - t0, j.usage);
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error(`Meta API ${feature}: no image returned`);
  return Buffer.from(b64, "base64");
}

export type Soul = {
  name: string; // the legend's title, e.g. "Keeper of the Bedside"
  line: string; // who I am, in the pet's own voice, resting on the imprints
  essence: string[]; // three short things that make this pet itself
  basis: string[]; // ids of the imprints it rests on
  scene: string; // one epic but true scene for the portrait, built from the imprints
};

// The soul portrait: once the starter set is full, the pet says who it is, from everything it has shown.
export async function readSoul(profile: object, imprints: object[]): Promise<Soul> {
  return sparkJson<Soul>(
    "soul",
    [
      "You are the voice of one particular pet. Its owner has just finished its first set of cards. Say who you are.",
      "Judge by deeds, not by guessing the heart: everything must rest on the imprints below. List the imprint ids you drew on in basis.",
      "name: a legendary card title in natural English with articles, 2-5 words, warm, specific to this pet (not generic fantasy), without the pet's name, e.g. 'Keeper of the Bedside'. line: two or three short first-person sentences, plain everyday words, no exclamation marks, about who you are and who you are to the owner. essence: three short phrases (2-5 words each) that make you yourself. scene: one sentence describing a single heroic but true-to-life scene for your portrait, built from your real places and habits, with no people.",
      "No health, food amounts or training advice. Answer in English.",
      `Profile: ${JSON.stringify(profile)}`,
      `Imprints: ${JSON.stringify(imprints)}`,
    ].join("\n"),
    "Who are you?",
    null,
    "soul",
    {
      type: "object",
      additionalProperties: false,
      required: ["name", "line", "essence", "basis", "scene"],
      properties: {
        name: { type: "string" },
        line: { type: "string" },
        essence: { type: "array", items: { type: "string" } },
        basis: { type: "array", items: { type: "string" } },
        scene: { type: "string" },
      },
    },
  );
}

// The legend's painting: the pet large in the frame, head high, so it can step out of the card's window.
export async function paintSoul(pet: Pick<Pet, "species" | "breed" | "sex" | "appearance">, refsB64: string[], scene: string): Promise<string> {
  const img = await editImage(
    "soul-art",
    [
      `All photos show the same animal: ${describePet(pet)}. Paint its legendary portrait as an epic fantasy trading card illustration, dramatic rim light, glowing magical details, painterly.`,
      `Scene: ${scene}.`,
      "Composition: tall portrait format; the animal sits or stands upright and proud, facing the viewer, large in the frame and seen from slightly below; its head and shoulders fill the upper third of the picture, its chest and front legs the middle; the scene opens up behind it. Weave the scene's details (places, toys) around it rather than changing its pose.",
      "Keep its exact face, coat, markings, eye colour and ear shape. No people, no text, no border.",
    ].join(" "),
    refsB64,
  );
  return putMedia(`${newId("art")}.jpg`, await sharp(img).resize(768, 1024, { fit: "cover", position: "top" }).jpeg({ quality: 90 }).toBuffer());
}

// Agent to agent: one pet's twin says its next line to another pet's twin, from its own imprints only.
export async function twinTurn(me: { profile: object; imprints: object[] }, otherName: string, transcript: { who: string; line: string }[], opening: boolean): Promise<{ line: string; mood: "happy" | "close" | "confused" | "thinking" }> {
  return sparkJson(
    "playdate-turn",
    [
      `You are the voice of one particular pet meeting another pet, ${otherName}, through your twins, before your owners let you meet in person. Speak in first person, warm and plain, one or two short sentences, no exclamation marks.`,
      "Talk about what matters for playing together: how you like to play, your energy, how you are with other animals and people, walks and places you know. Only say what your imprints show; if you don't know something about yourself, say so. Ask the other pet one simple question when it helps.",
      "Never talk about health, food or training methods. Never invent a memory.",
      opening ? "You speak first: say hello and one true thing about how you play." : "Answer what was just said, then add one true thing about yourself.",
      `Your profile: ${JSON.stringify(me.profile)}`,
      `Your imprints: ${JSON.stringify(me.imprints)}`,
      `The conversation so far: ${JSON.stringify(transcript)}`,
    ].join("\n"),
    "Your line.",
    null,
    "turn",
    { type: "object", additionalProperties: false, required: ["line", "mood"], properties: { line: { type: "string" }, mood: { type: "string", enum: ["happy", "close", "confused", "thinking"] } } },
  );
}

// After the twins talk: would these two get on? Every reason names whose cards it rests on; thin evidence says so.
export async function playReport(a: { name: string; imprints: object[] }, b: { name: string; imprints: object[] }, transcript: { who: string; line: string }[]): Promise<PlayReport> {
  return sparkJson<PlayReport>(
    "playdate-report",
    [
      `Two pets' twins just talked before their owners let them meet: ${a.name} ("me") and ${b.name} ("them"). Write a short, honest note for both owners on whether they might enjoy playing together.`,
      "Judge by deeds: each reason must rest on that pet's imprints; list the imprint ids in cardIds and say which pet (me or them). If the imprints say little about play or other animals, the verdict is \"not enough to tell\" and you say what photos would help.",
      "verdict: good match, worth a try, not yet, or not enough to tell. summary: two plain sentences. cautions: things to watch, only if the imprints suggest them. firstMeeting: two or three general tips for a first meeting (neutral ground, both on leash at first, owners close by, short and calm) phrased as general advice, not about these pets.",
      "This is advice for the owners, never a promise; owners decide in person. No health, food or training advice.",
      `${a.name}'s imprints: ${JSON.stringify(a.imprints)}`,
      `${b.name}'s imprints: ${JSON.stringify(b.imprints)}`,
      `What they said: ${JSON.stringify(transcript)}`,
    ].join("\n"),
    "Write the note.",
    null,
    "play_report",
    {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "summary", "reasons", "cautions", "firstMeeting"],
      properties: {
        verdict: { type: "string", enum: ["good match", "worth a try", "not yet", "not enough to tell"] },
        summary: { type: "string" },
        reasons: { type: "array", items: { type: "object", additionalProperties: false, required: ["pet", "text", "cardIds"], properties: { pet: { type: "string", enum: ["me", "them"] }, text: { type: "string" }, cardIds: { type: "array", items: { type: "string" } } } } },
        cautions: { type: "array", items: { type: "string" } },
        firstMeeting: { type: "array", items: { type: "string" } },
      },
    },
  );
}
