// Turn each captured module (out/mod_<name>.png) into a full-screen slide (out/slide_<name>.png, 3840x2160): the
// module alone, centred on the brand's soft lavender-to-pink background, with rounded corners and a soft shadow.
//
//   cd ~/Documents/coco && node docs/video/submission/compose.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.join(path.dirname(new URL(import.meta.url).pathname), "out");
const W = 3840, H = 2160;
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe9ff"/><stop offset="1" stop-color="#fde8f2"/></linearGradient>
  <radialGradient id="r" cx=".85" cy=".1" r=".6"><stop offset="0" stop-color="#d9ccff" stop-opacity=".7"/><stop offset="1" stop-color="#d9ccff" stop-opacity="0"/></radialGradient>
</defs><rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/></svg>`);

for (const f of fs.readdirSync(out).filter((x) => /^mod_.+\.png$/.test(x))) {
  const name = f.slice(4, -4);
  const m = await sharp(path.join(out, f)).metadata();
  const k = Math.min((W * 0.86) / m.width, (H * 0.8) / m.height, 1.6);
  const w = Math.round(m.width * k), h = Math.round(m.height * k);
  const r = 44;
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  const card = await sharp(path.join(out, f)).resize(w, h).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const shadow = await sharp({ create: { width: w + 160, height: h + 160, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="rgba(60,40,140,0.22)"/></svg>`), left: 80, top: 100 }])
    .blur(40).png().toBuffer();
  const left = Math.round((W - w) / 2), top = Math.round((H - h) / 2);
  await sharp(bg).composite([{ input: shadow, left: left - 80, top: top - 80 }, { input: card, left, top }]).png().toFile(path.join(out, `slide_${name}.png`));
  console.log("slide", name, w, h);
}
