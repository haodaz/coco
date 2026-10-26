import fs from "node:fs";
import sharp from "sharp";
import { parseImageStream, recordsOfKind, decodeMaskToRaster } from "@meta-sam/parser";
// For each card art: a background JPEG and a same-size foreground PNG with only the pet (SAM 3.1),
// so the card can move the two layers apart for depth.
const W = 682, H = 1024;
const items = process.argv.slice(2); // key=path
for (const it of items) {
  const [key, file] = it.split("=");
  const bg = await sharp(file).rotate().resize(W, H, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer();
  fs.writeFileSync(`data/uploads/art_lab-${key}.jpg`, bg);
  const r = await fetch("https://api.meta.ai/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${process.env.META_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({
    model: "sam-3.1", stream: false,
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "dog" }, { type: "input_image", image_url: `data:image/jpeg;base64,${bg.toString("base64")}` }] }] }) });
  const j = await r.json();
  const text = j.output?.[0]?.content?.[0]?.text ?? "";
  async function* ev() { yield { type: "response.output_text.delta", item_id: "m", output_index: 0, content_index: 0, delta: text }; yield { type: "response.output_text.done", item_id: "m", output_index: 0, content_index: 0, text }; yield { type: "response.completed" }; }
  const p = parseImageStream(ev()); for await (const _ of p);
  const masks = recordsOfKind((await p.finalResult).records, "mask");
  if (!masks.length) { console.log(key, "no mask", r.status, text.slice(0, 200)); continue; }
  const alpha = Buffer.alloc(W * H);
  for (const m of masks) { // every dog the model found (the field guide has three)
    const ras = decodeMaskToRaster(m.mask), mw = m.mask.width;
    for (let y = 0; y < m.mask.height; y++) for (let x = 0; x < mw; x++) if (ras[y * mw + x]) { const px = m.bounds.left + x, py = m.bounds.top + y; if (px < W && py < H) alpha[py * W + px] = 255; }
  }
  const soft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  const rgb = await sharp(bg).removeAlpha().raw().toBuffer();
  await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).joinChannel(soft, { raw: { width: W, height: H, channels: 1 } }).png().toFile(`data/uploads/art_lab-${key}-fg.png`);
  console.log(key, masks.length, "mask(s)");
}
