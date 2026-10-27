import fs from "node:fs";
import sharp from "sharp";
import convert from "heic-convert";
// Turn a pet's photos into a game-like character: one base pose learned from the photos, then each mood
// drawn from that base so the character stays the same. Usage: node probe-character.mjs <outDir> "<style>" photo...
const [out, style, ...photos] = process.argv.slice(2);
const who = "a female black Labrador Retriever: solid glossy black short coat, warm amber-brown eyes, soft drop ears, gentle face, athletic build";

const load = async (f) => {
  let b = fs.readFileSync(f);
  if (/heic$/i.test(f)) b = Buffer.from(await convert({ buffer: b, format: "JPEG", quality: 0.9 }));
  return (await sharp(b).rotate().resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer()).toString("base64");
};

async function edit(prompt, images) {
  const r = await fetch("https://api.meta.ai/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.META_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", n: 1, prompt, images: images.map((b) => ({ image_url: `data:image/jpeg;base64,${b}` })) }),
  });
  const j = await r.json();
  if (!j.data?.[0]?.b64_json) throw new Error(JSON.stringify(j).slice(0, 300));
  return sharp(Buffer.from(j.data[0].b64_json, "base64")).jpeg({ quality: 88 }).toBuffer();
}

const MOODS = {
  happy: "mouth open in a happy smile, tongue out a little, eyes bright, tail up",
  confused: "head tilted to one side, ears perked, puzzled look",
  thinking: "eyes looking up and to the side as if remembering something, mouth closed, calm",
  close: "leaning forward toward the viewer with her chin resting low, soft loving half-closed eyes, as if leaning on someone she loves",
  busy: "lying down, carefully pushing through a small pile of photo cards with one paw, focused look",
};

fs.mkdirSync(out, { recursive: true });
const refs = await Promise.all(photos.map(load));
const base = await edit(
  `All photos show the same dog, ${who}. Design her as a lovable game character in ${style}. Full body, sitting, facing the viewer, friendly and calm. Keep her exact markings, coat, eye colour and ear shape. Plain very light background, no text, no people.`,
  refs,
);
fs.writeFileSync(`${out}/idle.jpg`, base);
const b64 = base.toString("base64");
await Promise.all(
  Object.entries(MOODS).map(async ([k, m]) =>
    fs.writeFileSync(
      `${out}/${k}.jpg`,
      await edit(`The first image is a game character. Draw the exact same character: same style, same proportions, same colours, same plain background, full body, now ${m}. No text, no people.`, [b64, refs[0]]),
    ),
  ),
);
const names = ["idle", ...Object.keys(MOODS)];
const tiles = await Promise.all(names.map((k) => sharp(`${out}/${k}.jpg`).resize(240, 320, { fit: "cover" }).toBuffer()));
await sharp({ create: { width: names.length * 250 + 10, height: 340, channels: 3, background: "#fff" } })
  .composite(tiles.map((t, i) => ({ input: t, left: 10 + i * 250, top: 10 })))
  .jpeg()
  .toFile(`${out}/_sheet.jpg`);
console.log("done", out, names.join(","));
