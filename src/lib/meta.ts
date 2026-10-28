import { AsyncLocalStorage } from "node:async_hooks";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Pattern, QuestSlot } from "./species";
import { getMedia, putMedia } from "./media";
import { currentUserId } from "./session";
import { newId, UPLOADS } from "./store";
import { adminClient, HOSTED } from "./supabase";
import type { Pet, PetAction, PlayReport, Species, TraceKind } from "./types";
import { languageName } from "./i18n";

// The only place that talks to the Meta Model API.
// MOCK mode is the default until the hackathon credits arrive: no request leaves the machine and nothing is billed.
// Set META_LIVE=1 in .env.local to call the real API.

export const LIVE = process.env.META_LIVE === "1";

// The owner's language for this request: routes call writeIn(state.settings?.lang) after loading, and the prompts
// that write for people say which language to use. The AI's own notes (traces, the painting scene) stay in English.
const tongue = new AsyncLocalStorage<string>();
export const writeIn = (lang?: string | null) => tongue.enterWith(lang || "en");
const lang = () => languageName(tongue.getStore());
const forPeople = (fields: string) => `Write ${fields} in ${lang()}, natural and plain as a native speaker would say it. Trace labels and details, and scene, stay in short plain English: they are the AI's own notes.`;
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

// Two homes for Muse Spark: the hosted Meta Model API, and Muse Spark Open (Meta's open-weights model) on Baseten.
// Conversation-heavy text features run on the open model when its key is set; anything with photos stays on the
// Meta API. If one side fails, the other is tried, so the pet keeps answering.
type Provider = "meta" | "open";
const OPEN_KEY = process.env.BASETEN_API_KEY;
const OPEN_BASE = "https://inference.baseten.co/v1";
const OPEN_MODEL = "meta-models/muse-spark-open-1026";
// the owner's own conversation, notes and the soul portrait stay on the hosted API (most polished answers);
// the social features that run many turns (sitters, playdates) use the open model
const OPEN_FEATURES = new Set(["ask-sitter", "playdate-turn", "playdate-report"]);
const forced = new AsyncLocalStorage<Provider>();
// for side-by-side checks: run a piece of work on one provider
export const onProvider = <T>(p: Provider, fn: () => Promise<T>) => forced.run(p, fn);

async function chat(provider: Provider, body: object) {
  const open = provider === "open";
  const res = await fetch(`${open ? OPEN_BASE : BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: open ? `Api-Key ${OPEN_KEY}` : `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model: open ? OPEN_MODEL : SPARK }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${open ? "Muse Spark Open" : "Meta API"} ${res.status}: ${JSON.stringify(json)?.slice(0, 300)}`);
  return json;
}

// Muse Spark with an optional image and a JSON schema; returns the parsed object.
async function sparkJson<T>(feature: string, system: string, prompt: string, imageB64: string | string[] | null, name: string, schema: object, budget = 6000, provider?: Provider): Promise<T> {
  const p: Provider = provider ?? forced.getStore() ?? (OPEN_KEY && !imageB64 && OPEN_FEATURES.has(feature) ? "open" : "meta");
  const body = {
    max_tokens: budget, // reasoning tokens count toward this, so leave room
    messages: [
      { role: "system", content: system },
      { role: "user", content: imageB64 ? [{ type: "text", text: prompt }, ...[imageB64].flat().map((b) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b}` } }))] : prompt },
    ],
    response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
  };
  const t0 = Date.now();
  let j;
  try {
    j = await chat(p, body);
  } catch (e) {
    const other: Provider = p === "open" ? "meta" : "open";
    if (forced.getStore() || (other === "open" && !OPEN_KEY)) throw e;
    console.warn(`[${feature}] ${p} failed, trying ${other}:`, (e as Error).message); // shows in the server logs
    j = await chat(other, body); // the other home answers instead
    await logUsage(feature, other === "open" ? OPEN_MODEL : SPARK, Date.now() - t0, j.usage);
    return parseAnswer<T>(j, feature);
  }
  await logUsage(feature, p === "open" ? OPEN_MODEL : SPARK, Date.now() - t0, j.usage);
  // the model thought too long and the answer was cut off: once more with a bigger budget
  if (j.choices?.[0]?.finish_reason === "length" && budget < 16000) return sparkJson<T>(feature, system, prompt, imageB64, name, schema, 16000, p);
  return parseAnswer<T>(j, feature);
}

function parseAnswer<T>(j: { choices?: { message?: { content?: string }; finish_reason?: string }[] }, feature: string): T {
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${feature}: empty answer (finish_reason ${j.choices?.[0]?.finish_reason})`);
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
  observation: string; // in the owner's language
  scene?: string; // the same, in plain English, for painting
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
    `You identify a pet from one photo. Describe appearance only: species, up to three breed guesses with confidence 0-1 (together at most 1; say 'mixed' or 'unknown' honestly), coat, distinctive marks, size. Never judge health, weight or condition. Write breed names, coat, marks and size in ${lang()}.`,
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
      "scene: the same as observation, in plain English, for the painter.",
      forPeople("cardName, line and observation"),
      "rarity: 1 ordinary moment, 2 a moment with real character, 3 something truly unusual. Most photos are 1.",
      "Never mention health, weight, food amounts, medicine or training advice. No exclamation marks.",
    ].join("\n"),
    "Read this photo.",
    await withRef(imageB64, refB64),
    "photo_reading",
    {
      type: "object",
      additionalProperties: false,
      required: ["traces", "cardName", "line", "observation", "scene", "rarity"],
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
        scene: { type: "string" },
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
// what a pet wears or holds moves with it, so it is cut out together with the pet
const WORN_AND_HELD = ["clothing", "collar", "bandana", "harness", "leash", "toy", "rope", "rope toy", "plush toy", "chew toy", "bone", "ball", "stick", "blanket", "the object in its mouth", "the object in its paws"];

export async function depthLayer(artFile: string, phrase: string): Promise<string | null> {
  if (!LIVE) return null;
  const png = await petLayer(await getMedia(artFile), phrase, WORN_AND_HELD, "depth-layer");
  if (!png) return null;
  return putMedia(artFile.replace(/\?.*$/, "").replace(/\.jpg$/, "-fg.png"), png);
}

// The pet alone on a transparent PNG the same size as the image (at most 1024 px on its long side).
// Things near the pet (what it wears or holds, the cards it plays with) are kept with it, or the layer looks torn.
// The painting without the pet: the layer behind the moving cut-out, so nothing of the pet is left behind when it moves.
export async function cleanPlate(artFile: string, phrase: string): Promise<string | null> {
  if (!LIVE) return null;
  const art = await getMedia(artFile);
  const b64 = (await sharp(art).jpeg({ quality: 90 }).toBuffer()).toString("base64");
  const img = await editImage(
    "clean-plate",
    `Remove the ${phrase} from this picture, together with everything it wears or holds (collar, clothes, toys, anything in its mouth or paws), and its shadow. Fill that space with what would be behind it, continuing the same scene. Keep everything else exactly as it is: the same style, colours, light, framing and size. No new animals, people or objects.`,
    [b64],
  );
  const { width, height } = await sharp(art).metadata();
  const fitted = await sharp(img).resize(width, height, { fit: "cover" }).jpeg({ quality: 90 }).toBuffer();
  return putMedia(artFile.replace(/\?.*$/, "").replace(/\.(jpg|png)$/, "") + "-bg.jpg", fitted);
}

// The pet layer, cut by what the clean scene took away: compare the painting with its clean scene and keep the SAM
// shapes (the pet, and what it wears or holds) that mostly lie where the two differ. Other animals and people, and
// their things, are still in the clean scene, so they stay in the scene and never come loose.
async function petLayerByDiff(art: Buffer, plate: Buffer, phrase: string): Promise<Buffer | null> {
  const { width, height } = await sharp(art).metadata();
  if (!width || !height) return null;
  const a = await sharp(art).removeAlpha().raw().toBuffer();
  const p = await sharp(plate).resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const diff = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) diff[i] = Math.max(Math.abs(a[i * 3] - p[i * 3]), Math.abs(a[i * 3 + 1] - p[i * 3 + 1]), Math.abs(a[i * 3 + 2] - p[i * 3 + 2]));
  // smooth out the painter's small re-rendering differences; what is left is what was taken away
  const changed = await sharp(diff, { raw: { width, height, channels: 1 } }).blur(3).threshold(40).extractChannel(0).raw().toBuffer();
  const jpeg = await sharp(art).jpeg({ quality: 92 }).toBuffer();
  const [pets, ...extras] = await Promise.all([phrase, ...WORN_AND_HELD].map((ph) => samMasks(jpeg, ph, "depth-layer")));
  const score = async (m: (typeof pets)[number]) => {
    const one = await maskAlpha([m], width, height);
    let inside = 0, hit = 0;
    for (let i = 0; i < one.length; i++) if (one[i]) { inside++; if (changed[i]) hit++; }
    return { m, one, inside, hit, share: inside ? hit / inside : 0 };
  };
  // one pet: the animal the clean scene took away (other animals may be re-drawn a little, but far less of them changes)
  const scored = await Promise.all(pets.map(score));
  const pet = scored.filter((x) => x.share >= 0.3).sort((x, y) => y.hit - x.hit)[0];
  if (!pet) return null;
  // what it wears and holds: taken away too, and touching the pet itself (not just near it)
  const near = await sharp(pet.one, { raw: { width, height, channels: 1 } }).blur(12).threshold(8).extractChannel(0).raw().toBuffer();
  const pick: Awaited<ReturnType<typeof samMasks>>[number][] = [pet.m];
  for (const x of await Promise.all(extras.flat().map(score))) {
    if (x.share < 0.5) continue;
    let touch = 0;
    for (let i = 0; i < x.one.length; i++) if (x.one[i] && near[i]) touch++;
    if (touch / x.inside >= 0.05) pick.push(x.m);
  }
  if (!pick.length) return null;
  const hard = await maskAlpha(pick, width, height);
  // a shape can hold more than the pet (two dogs found as one): keep only what the clean scene took away (a little
  // grown, for fur at the edge), then only the biggest connected piece (the pet, with what it wears and holds)
  const grown = await sharp(changed, { raw: { width, height, channels: 1 } }).blur(4).threshold(10).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < hard.length; i++) if (!grown[i]) hard[i] = 0;
  const keep = await largestPiece(hard, width, height);
  const soft = await sharp(keep, { raw: { width, height, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  return sharp(a, { raw: { width, height, channels: 3 } }).joinChannel(soft, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

// the biggest connected piece of a mask (found at a quarter of the size, then applied at full size), small holes closed
async function largestPiece(mask: Buffer, width: number, height: number): Promise<Buffer> {
  const w = Math.max(1, Math.round(width / 4)), h = Math.max(1, Math.round(height / 4));
  const small = await sharp(mask, { raw: { width, height, channels: 1 } }).resize(w, h, { kernel: "nearest" }).extractChannel(0).raw().toBuffer();
  const label = new Int32Array(w * h);
  let best = 0, bestSize = 0, next = 0;
  for (let start = 0; start < w * h; start++) {
    if (!small[start] || label[start]) continue;
    next++;
    let size = 0;
    const stack = [start];
    label[start] = next;
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % w, y = (i / w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (small[j] && !label[j]) { label[j] = next; stack.push(j); }
      }
    }
    if (size > bestSize) { bestSize = size; best = next; }
  }
  const pieceSmall = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) if (label[i] === best) pieceSmall[i] = 255;
  const piece = await sharp(pieceSmall, { raw: { width: w, height: h, channels: 1 } }).resize(width, height, { kernel: "nearest" }).blur(3).threshold(100).extractChannel(0).raw().toBuffer();
  const out = Buffer.alloc(width * height);
  for (let i = 0; i < out.length; i++) out[i] = mask[i] && piece[i] ? 255 : 0;
  return out;
}

// Cut the pet layer again from a card's painting and its clean scene (no new painting).
export async function recutPetLayer(artFile: string, plateFile: string, phrase: string): Promise<string | null> {
  if (!LIVE) return null;
  const png = await petLayerByDiff(await getMedia(artFile), await getMedia(plateFile), phrase);
  if (!png) return null;
  return putMedia(artFile.replace(/\?.*$/, "").replace(/\.(jpg|png)$/, "") + "-fg.png", png);
}

// Both layers of a card that moves in depth: first the scene without the pet, then the pet cut by what that scene
// took away. Without a clean scene the card still gets a pet layer, but the two are shown together, never apart.
export async function depthLayers(artFile: string, phrase: string): Promise<{ fg: string | null; plate: string | null }> {
  const plate = await cleanPlate(artFile, phrase).catch(() => null);
  const fg = plate ? await recutPetLayer(artFile, plate, phrase).catch(() => null) : await depthLayer(artFile, phrase).catch(() => null);
  return { fg, plate: fg ? plate : null };
}

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
      forPeople("line"),
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
  action: PetAction | null; // something to open beside the conversation
  facts: string[]; // ids of the place facts (weather, checks, rules) the answer uses
};

// The twin answers a question from the owner, in the pet's voice, resting only on its imprints.
export async function askPet(question: string, profile: object, imprints: object[], senses: string[], slotTitles: string[], audience: "owner" | "sitter" = "owner", tools: { topics: { pattern: string; label: string }[]; emptySlots: { id: string; title: string }[] } | null = null, place: { area: string | null; facts: { id: string; title: string; text: string; source: string }[] } = { area: null, facts: [] }): Promise<Answer> {
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
      "Judge by deeds, not by guessing the heart: anything you say about yourself (your likes, habits, places, people, reactions) must rest on the imprints below. List the imprints you used in basis with their ids and a few words on how each supports the answer; cite at most three, the most relevant, and don't recite a list of moments.",
      "You may use general knowledge about your species or breed, but say it as general (\"Labradors usually…\", \"most dogs…\") and list it in general. Never present general knowledge as a memory of your own.",
      "If the imprints say nothing about the topic, say plainly and naturally that you don't have a memory of that yet (for example \"I don't have a memory of that yet.\"), never guess what you would do, and fill gap with the topic (what they asked about, in their plain words, for example \"the beach\"; never a topic id or a photo kind) and which kind of photo would teach you (pick from the photo kinds listed); keep those photo kind names out of your answer sentence. You may still add one helpful, safe general sentence (for example, most shops don't let dogs in). Otherwise gap is null.",
      "Health, symptoms, food amounts, medicine, vaccines or training methods: do not advise, do not guess, and never say how your body feels. Say kindly, in your own voice, that a vet is the one to ask before giving you anything, and stop there. For these questions gap is null and basis is empty.",
      "Never mention people's identities beyond their role. Never invent dates.",
      place.area
        ? [
            `Where you and your owner live: ${place.area}. Below are facts about the place, checked just now by code (weather, safety checks, rules, nearby pet places). They are true for now; you did not decide them.`,
            "When the owner mentions a plan (going out, a shop, the car, a walk, a park, a trip, someone looking after you) or asks about weather or rules, speak up for yourself using these facts: say plainly what fits the plan, give the reason in a few words (the temperature, the rule), and offer a better way when the plan doesn't work for you. List the fact ids you used in facts.",
            "Never state a temperature, a rule, a law or a place that is not in the facts. If what they need is not there, say you don't know that about where you live and they should check.",
            "Never suggest leaving you waiting in a parked car, whatever the weather; use the car check for the reason.",
            "A nearby place from the facts is a listing, not a recommendation; you may name it, never vouch for it.",
          ].join("\n")
        : "Never suggest leaving you in a parked car: whether that is safe depends on today's weather, which you cannot see. If it comes up, say you don't know where we live yet, so you can't check the weather; the owner can tell you on the Around us page. facts is empty.",
      "mood: close when the answer is about you and the owner, confused when there is a gap, thinking for the vet answer, happy otherwise.",
      tools
        ? [
            "action: you can open one thing on your owner's screen beside the conversation, when it helps them do or see what they asked; otherwise null.",
            "show_cards: cards about a topic or the ones you cite (cardIds and/or topic). open_card: one card (cardIds = [its id]). open_pack: today's pack, when they want to add a memory or ask about today's pack. add_photo: when there is a gap, so they can add a photo (slotId = an empty starter slot that fits, or null for a daily pack). show_memory: how well you know yourself / clarity. show_place: the weather and checks for a plan, or where you live (also when no place is set and they talk about a plan). make_link: when they mention a sitter, boarding, someone looking after you (kind sitter) or finding a playmate (kind playdate).",
            `Topics: ${JSON.stringify(tools.topics)}. Empty starter slots: ${JSON.stringify(tools.emptySlots)}.`,
          ].join("\n")
        : "action is always null.",
      "",
      `Profile: ${JSON.stringify(profile)}`,
      `Imprints (each is a card with a photo the owner shared): ${JSON.stringify(imprints)}`,
      `What the imprints cover: ${senses.join("; ")}`,
      `Photo kinds that teach you: ${slotTitles.join("; ")}`,
      place.area ? `Place facts: ${JSON.stringify(place.facts)}` : "",
    ].join("\n"),
    question,
    null,
    "answer",
    {
      type: "object",
      additionalProperties: false,
      required: ["answer", "basis", "general", "gap", "mood", "action", "facts"],
      properties: {
        answer: { type: "string" },
        basis: { type: "array", items: { type: "object", additionalProperties: false, required: ["cardId", "how"], properties: { cardId: { type: "string" }, how: { type: "string" } } } },
        general: { type: "array", items: { type: "string" } },
        facts: { type: "array", items: { type: "string" } },
        mood: { type: "string", enum: ["happy", "close", "confused", "thinking"] },
        action: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "cardIds", "topic", "slotId", "kind"],
              properties: {
                type: { type: "string", enum: ["show_cards", "open_card", "open_pack", "add_photo", "show_memory", "make_link", "show_place"] },
                cardIds: { type: "array", items: { type: "string" } },
                topic: { type: ["string", "null"] },
                slotId: { type: ["string", "null"] },
                kind: { type: ["string", "null"], enum: ["sitter", "playdate", null] },
              },
            },
          ],
        },
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
      "scene: the same as observation, in plain English, for the painter.",
      forPeople("cardName, line and observation"),
      "rarity: 1 ordinary moment, 2 a moment with real character, 3 something truly unusual. Most photos are 1.",
      "Never mention health, weight, food amounts, medicine or training advice. No exclamation marks.",
    ].join("\n"),
    "Read this photo.",
    await withRef(imageB64, refB64),
    "moment_reading",
    {
      type: "object",
      additionalProperties: false,
      required: ["pattern", "traces", "cardName", "line", "observation", "scene", "rarity"],
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
        scene: { type: "string" },
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
      "name: a legendary card title, 2-5 words (or the natural length in the language), warm, specific to this pet (not generic fantasy), without the pet's name, e.g. 'Keeper of the Bedside'. line: two or three short first-person sentences, plain everyday words, no exclamation marks, about who you are and who you are to the owner. essence: three short phrases (2-5 words each) that make you yourself. scene: one sentence describing a single heroic but true-to-life scene for your portrait, built from your real places and habits, with no people.",
      "No health, food amounts or training advice.",
      forPeople("name, line and essence"),
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
      "Your imprints describe you from outside, in the third person; say them as yourself (\"I run after my yellow ball\"), in your own words. Never copy a description sentence or speak about yourself by name.",
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
