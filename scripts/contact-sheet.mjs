import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import convert from "heic-convert";
// Local-only contact sheet of a photo folder (nothing is sent anywhere): thumbnails with file name and capture date.
const dir = process.argv[2], out = process.argv[3];
const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|heic)$/i.test(f)).sort();
const T = 300;
const tiles = [];
for (const f of files) {
  let buf = fs.readFileSync(path.join(dir, f));
  let date = "";
  try { const e = await exifr.parse(buf, ["DateTimeOriginal", "CreateDate"]); const d = e?.DateTimeOriginal ?? e?.CreateDate; if (d) date = d.toISOString().slice(0, 10); } catch {}
  if (/heic$/i.test(f)) buf = Buffer.from(await convert({ buffer: buf, format: "JPEG", quality: 0.8 }));
  const img = await sharp(buf).rotate().resize(T, T, { fit: "cover" }).toBuffer();
  const label = Buffer.from(`<svg width="${T}" height="26"><rect width="100%" height="100%" fill="#000" opacity=".6"/><text x="6" y="18" font-size="14" font-family="Arial" fill="#fff">${f.slice(0, 22)} ${date}</text></svg>`);
  tiles.push(await sharp(img).composite([{ input: label, top: T - 26, left: 0 }]).toBuffer());
}
const cols = 4, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * (T + 8) + 8, height: rows * (T + 8) + 8, channels: 3, background: "#eee" } })
  .composite(tiles.map((t, i) => ({ input: t, left: 8 + (i % cols) * (T + 8), top: 8 + Math.floor(i / cols) * (T + 8) }))).jpeg({ quality: 82 }).toFile(out);
console.log(files.join("\n"));
