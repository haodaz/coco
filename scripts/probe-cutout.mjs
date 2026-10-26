import fs from "node:fs";
import sharp from "sharp";
import { parseImageStream, recordsOfKind, decodeMaskToRaster } from "@meta-sam/parser";
// Decode a saved SAM 3.1 response (data/sam-out.txt) into a transparent cutout of the photo it was run on.
const [photo, out] = process.argv.slice(2);
const text = JSON.parse(fs.readFileSync("data/sam-out.txt", "utf8")).output[0].content[0].text;
async function* events() {
  yield { type: "response.output_text.delta", item_id: "m", output_index: 0, content_index: 0, delta: text };
  yield { type: "response.output_text.done", item_id: "m", output_index: 0, content_index: 0, text };
  yield { type: "response.completed" };
}
const parsed = parseImageStream(events());
for await (const _ of parsed);
const result = await parsed.finalResult;
const [m] = recordsOfKind(result.records, "mask");
console.log(result.outcome, m.objectId, m.bounds, Object.keys(m.mask), m.mask.width, m.mask.height);
const raster = decodeMaskToRaster(m.mask);
const img = sharp(photo).rotate().resize({ width: 1024, height: 1024, fit: "inside" });
const { width, height } = await img.clone().jpeg().toBuffer({ resolveWithObject: true }).then((r) => r.info);
console.log("photo", width, height, "raster", raster.length);
const alpha = Buffer.alloc(width * height);
const mw = m.mask.width, mh = m.mask.height, ox = m.bounds.left, oy = m.bounds.top;
for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (raster[y * mw + x]) { const px = ox + x, py = oy + y; if (px < width && py < height) alpha[py * width + px] = 255; }
const rgb = await img.removeAlpha().raw().toBuffer();
await sharp(rgb, { raw: { width, height, channels: 3 } }).joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toFile(out);
await sharp(out).flatten({ background: "#ff66cc" }).resize({ width: 400 }).jpeg().toFile(out.replace(".png", "-preview.jpg"));
console.log("saved", out);
