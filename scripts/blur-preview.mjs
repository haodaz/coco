import fs from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
const [inp, out] = process.argv.slice(2);
const jpeg = await sharp(inp).rotate().resize({ width: 1600, height: 1600, fit: "inside" }).jpeg().toBuffer();
fs.writeFileSync(out + ".src.jpg", jpeg);
const boxes = JSON.parse(execFileSync("/Users/aisandbox/Documents/coco/data/bin/faces", [out + ".src.jpg"]).toString());
const { width: W, height: H } = await sharp(jpeg).metadata();
const layers = await Promise.all(boxes.map(async (b) => {
  const mx = b.w * 0.45, my = b.h * 0.55;
  const left = Math.max(0, Math.floor((b.x - mx) * W)), top = Math.max(0, Math.floor((b.y - my) * H));
  const width = Math.min(W - left, Math.ceil((b.w + 2 * mx) * W)), height = Math.min(H - top, Math.ceil((b.h + 2 * my) * H));
  const blurred = await sharp(jpeg).extract({ left, top, width, height }).blur(Math.max(12, width / 6)).toBuffer();
  const oval = Buffer.from(`<svg width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="#fff"/></svg>`);
  return { input: await sharp(blurred).composite([{ input: oval, blend: "dest-in" }]).png().toBuffer(), left, top };
}));
await sharp(await sharp(jpeg).composite(layers).toBuffer()).resize({ width: 600 }).jpeg().toFile(out);
console.log(boxes.length, "face(s)");
