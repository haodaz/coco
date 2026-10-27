import fs from "node:fs";
import sharp from "sharp";
// One reference photo → the same pet redrawn from scratch in many art styles (new pose, new scene).
const [file, outDir] = process.argv.slice(2);
const who = "a female black Labrador Retriever: solid glossy black short coat, warm amber-brown eyes, soft drop ears, gentle tilted-head look, large athletic build";
const STYLES = {
  "tcg-holo": "an epic fantasy trading card illustration: she stands on a moonlit cliff with glowing runes, dramatic rim light, painterly detail",
  "ukiyo-e": "a Japanese ukiyo-e woodblock print: she rests under a blossoming plum tree by a river, flat colour, bold outlines, paper texture",
  "vinyl-toy": "a collectible blind-box vinyl toy figure: chibi proportions, glossy plastic, sitting on a pastel pedestal, studio product photo",
  "pixel": "16-bit pixel art: she runs across a grassy meadow at sunset, retro game sprite style, crisp pixels",
  "storybook": "a children's picture book page in gouache: she carries a basket of apples through an autumn village, warm and cosy",
  "tarot": "an art nouveau tarot card illustration: she sits regally among stars and a crescent moon, ornate flowing lines, gold accents",
  "papercut": "layered paper-cut art: she curls up asleep in a little forest den, soft shadows between paper layers",
  "naturalist": "a vintage naturalist field-guide plate: careful pencil and watercolour study of her in three poses, handwritten-style labels left blank",
};
const b64 = (await sharp(file).rotate().resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 85 }).toBuffer()).toString("base64");
fs.mkdirSync(outDir, { recursive: true });
await Promise.all(Object.entries(STYLES).map(async ([k, style]) => {
  const t0 = Date.now();
  const prompt = `Create a completely new artwork of this specific dog, ${who}. Use the photo only to learn what she looks like; do not copy the photo's pose, background or framing. Draw her in a new pose and scene as ${style}. Keep her recognisable: same coat, eye colour, ear shape and face. No people, no text, no border.`;
  const r = await fetch("https://api.meta.ai/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${(process.env.MODEL_API_KEY ?? process.env.META_API_KEY)}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "muse-image-1.0", n: 1, prompt, images: [{ image_url: `data:image/jpeg;base64,${b64}` }] }) });
  const j = await r.json();
  const d = j.data?.[0];
  if (!d?.b64_json) return console.log(k, r.status, JSON.stringify(j).slice(0, 300));
  await sharp(Buffer.from(d.b64_json, "base64")).jpeg({ quality: 88 }).toFile(`${outDir}/${k}.jpg`);
  console.log(k, Date.now() - t0, "ms", j.usage?.total_tokens);
}));
// contact sheet
const files = Object.keys(STYLES).filter((k) => fs.existsSync(`${outDir}/${k}.jpg`));
const tiles = await Promise.all(files.map((k) => sharp(`${outDir}/${k}.jpg`).resize(360, 480, { fit: "cover" }).toBuffer()));
await sharp({ create: { width: 360 * 4 + 50, height: 480 * Math.ceil(tiles.length / 4) + 10 * (Math.ceil(tiles.length / 4) + 1), channels: 3, background: "#f5f6fb" } })
  .composite(tiles.map((t, i) => ({ input: t, left: 10 + (i % 4) * 370, top: 10 + Math.floor(i / 4) * 490 }))).jpeg({ quality: 85 }).toFile(`${outDir}/_sheet.jpg`);
console.log("order:", files.join(", "));
