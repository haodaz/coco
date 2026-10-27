import fs from "node:fs";
import sharp from "sharp";
// Animation frames for a character mood: the same image with one small change, so frames can loop like a GIF.
// Usage: node probe-frames.mjs <moodImage> <outPrefix> "<change 1>" "<change 2>" ...
const [src, outPrefix, ...changes] = process.argv.slice(2);
const b64 = fs.readFileSync(src).toString("base64");
const frames = await Promise.all(
  changes.map(async (change) => {
    const r = await fetch("https://api.meta.ai/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${(process.env.MODEL_API_KEY ?? process.env.META_API_KEY)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-image-1.0",
        n: 1,
        prompt: `Keep this image exactly the same: same character, same pose, same framing, same camera, same lighting, same background, same size and position. Change only one thing: ${change}. Nothing else moves.`,
        images: [{ image_url: `data:image/jpeg;base64,${b64}` }],
      }),
    });
    const j = await r.json();
    if (!j.data?.[0]?.b64_json) throw new Error(JSON.stringify(j).slice(0, 300));
    return sharp(Buffer.from(j.data[0].b64_json, "base64")).resize(768, 1024, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer();
  }),
);
const all = [await sharp(src).resize(768, 1024, { fit: "cover" }).jpeg().toBuffer(), ...frames];
all.forEach((f, i) => fs.writeFileSync(`${outPrefix}-${i}.jpg`, f));
const tiles = await Promise.all(all.map((f) => sharp(f).resize(240, 320).toBuffer()));
await sharp({ create: { width: tiles.length * 250 + 10, height: 340, channels: 3, background: "#fff" } })
  .composite(tiles.map((t, i) => ({ input: t, left: 10 + i * 250, top: 10 })))
  .jpeg()
  .toFile(`${outPrefix}-sheet.jpg`);
console.log("frames", all.length);
