import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
// One-off: stand an existing character's moods on the same ground line (same rule as ground() in src/lib/character.ts).
const s = JSON.parse(fs.readFileSync("data/state.json", "utf8"));
const UP = "data/uploads", GROUND = 0.95;
for (const files of Object.values(s.pets[0].character.moods)) {
  const first = await sharp(path.join(UP, files[0])).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = first.info;
  let bottom = 0;
  for (let y = height - 1; y >= 0 && !bottom; y--) for (let x = 0; x < width; x++) if (first.data[y * width + x] > 24) { bottom = y; break; }
  const shift = Math.round(height * GROUND) - bottom;
  console.log(files[0], "bottom", bottom, "shift", shift);
  if (!bottom || Math.abs(shift) < 4) continue;
  for (const f of files) {
    const file = path.join(UP, f);
    const img = sharp(fs.readFileSync(file)).ensureAlpha();
    const moved = shift > 0
      ? img.extend({ top: shift, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).extract({ left: 0, top: 0, width, height })
      : img.extend({ top: 0, bottom: -shift, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).extract({ left: 0, top: -shift, width, height });
    fs.writeFileSync(file, await moved.png().toBuffer());
  }
}
