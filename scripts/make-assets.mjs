import fs from "node:fs";
import sharp from "sharp";
import { parseImageStream, recordsOfKind, decodeMaskToRaster } from "@meta-sam/parser";
// Workspace art: single objects in one 3D semi-realistic cartoon style, painted on white, cut out with SAM onto
// transparent PNGs, trimmed, so pages can compose them freely. Usage: node scripts/make-assets.mjs [name ...]
const KEY = process.env.MODEL_API_KEY ?? process.env.META_API_KEY;
const OUT = "public/ws/assets";
const STYLE = "3D semi-realistic cartoon render, like a premium animated film prop, soft studio lighting, gentle shadows on the object only, warm and charming. One single object, centered, whole object in frame with empty space around it, on a plain pure white background. No text, no logo, no floor, no cast shadow.";
const ASSETS = {
  pack: { key: true, phrase: "card pack", prompt: "A sealed collectible trading-card booster pack, crinkled foil wrapper with a soft holographic sheen in lilac, gold and pink, a small paw-print emblem, slightly tilted." },
  fan: { phrase: "cards", prompt: "A fan of five collectible trading cards held in a loose arc, each card a tiny painted portrait of a different pet (a black dog, a tabby cat, a green parrot, a turtle, a white rabbit), glossy holographic edges." },
  box: { key: true, phrase: "box", prompt: "A small open gift box glowing from inside, warm golden light and a few sparkles spilling out, kraft paper with a ribbon untied." },
  cat: { phrase: "cat", prompt: "A fluffy orange tabby cat sitting upright, curious friendly face, full body." },
  parrot: { phrase: "parrot", prompt: "A bright green parrot standing, head tilted, full body." },
  turtle: { phrase: "turtle", prompt: "A small friendly box turtle walking, full body." },
  rabbit: { phrase: "rabbit", prompt: "A white rabbit with soft lop ears sitting, full body." },
  polaroids: { key: true, phrase: "photos", prompt: "A small loose stack of instant photos of a dog, slightly fanned, tied with a thin red ribbon." },
  frame: { phrase: "frame", prompt: "An ornate small golden picture frame standing upright, the inside empty and plain white." },
};

async function paint(prompt) {
  const r = await fetch("https://api.meta.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", n: 1, prompt: `${prompt} ${STYLE}` }),
  });
  const j = await r.json();
  if (!j.data?.[0]?.b64_json) throw new Error(JSON.stringify(j).slice(0, 200));
  return sharp(Buffer.from(j.data[0].b64_json, "base64")).resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 92 }).toBuffer();
}

async function cut(jpeg, phrase) {
  const r = await fetch("https://api.meta.ai/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sam-3.1", stream: false, input: [{ type: "message", role: "user", content: [{ type: "input_text", text: phrase }, { type: "input_image", image_url: `data:image/jpeg;base64,${jpeg.toString("base64")}` }] }] }),
  });
  const text = (await r.json()).output?.[0]?.content?.[0]?.text ?? "";
  async function* ev() { yield { type: "response.output_text.delta", item_id: "m", output_index: 0, content_index: 0, delta: text }; yield { type: "response.output_text.done", item_id: "m", output_index: 0, content_index: 0, text }; yield { type: "response.completed" }; }
  const p = parseImageStream(ev()); for await (const _ of p);
  const masks = recordsOfKind((await p.finalResult).records, "mask");
  const { width: W, height: H } = await sharp(jpeg).metadata();
  const alpha = Buffer.alloc(W * H);
  for (const m of masks) {
    const ras = decodeMaskToRaster(m.mask), mw = m.mask.width;
    for (let y = 0; y < m.mask.height; y++) for (let x = 0; x < mw; x++) if (ras[y * mw + x]) { const px = m.bounds.left + x, py = m.bounds.top + y; if (px < W && py < H) alpha[py * W + px] = 255; }
  }
  if (!masks.length) return null;
  const soft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(0.7).extractChannel(0).raw().toBuffer();
  const rgb = await sharp(jpeg).removeAlpha().raw().toBuffer();
  const png = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).joinChannel(soft, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  return sharp(png).trim({ threshold: 1 }).png({ compressionLevel: 9, palette: true, quality: 92 }).toBuffer();
}

// Objects on white: remove only the white that touches the edges (flood fill), so white inside the object stays.
async function keyWhite(jpeg) {
  const { data, info } = await sharp(jpeg).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const bg = new Uint8Array(W * H);
  const near = (i) => data[i * 3] > 236 && data[i * 3 + 1] > 236 && data[i * 3 + 2] > 236;
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop();
    if (bg[i] || !near(i)) continue;
    bg[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  const alpha = Buffer.from(bg.map((v) => (v ? 0 : 255)));
  const soft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  const png = await sharp(data, { raw: { width: W, height: H, channels: 3 } }).joinChannel(soft, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  return sharp(png).trim({ threshold: 1 }).png({ compressionLevel: 9, palette: true, quality: 92 }).toBuffer();
}

fs.mkdirSync(OUT, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ASSETS);
await Promise.all(
  names.map(async (n) => {
    const a = ASSETS[n];
    const jpeg = await paint(a.prompt);
    fs.writeFileSync(`data/asset-${n}.jpg`, jpeg);
    const png = a.key ? await keyWhite(jpeg) : await cut(jpeg, a.phrase);
    if (!png) return console.log(n, "SAM found nothing");
    fs.writeFileSync(`${OUT}/${n}.png`, png);
    const m = await sharp(png).metadata();
    console.log(n, m.width, "x", m.height, Math.round(png.length / 1024), "KB");
  }),
);
// contact sheet on a checker so transparency shows
const files = names.filter((n) => fs.existsSync(`${OUT}/${n}.png`));
const tiles = await Promise.all(files.map((n) => sharp(`${OUT}/${n}.png`).resize(260, 260, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).flatten({ background: "#f3d9e8" }).toBuffer()));
await sharp({ create: { width: Math.min(files.length, 5) * 270 + 10, height: Math.ceil(files.length / 5) * 270 + 10, channels: 3, background: "#fff" } })
  .composite(tiles.map((t, i) => ({ input: t, left: 10 + (i % 5) * 270, top: 10 + Math.floor(i / 5) * 270 })))
  .jpeg()
  .toFile("data/assets-sheet.jpg");
