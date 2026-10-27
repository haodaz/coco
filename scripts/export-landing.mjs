import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
// Copies the real pet's cards, character and portraits from local data into public/landing, so the landing page
// shows them on any clone (data/ is git-ignored). Run with the dev server up: node scripts/export-landing.mjs [port]
const port = process.argv[2] ?? "3030";
const s = JSON.parse(fs.readFileSync("data/state.json", "utf8"));
const pet = s.pets[0];
const OUT = "public/landing";
const UP = "data/uploads";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(`${OUT}/char`, { recursive: true });
fs.mkdirSync(`${OUT}/styles`, { recursive: true });
const file = (u) => path.join(UP, u.replace("/api/art/", "").replace(/\?.*$/, ""));

async function card(c, key) {
  const out = { key, name: c.name, line: c.line, rarity: c.rarity, kind: c.kind, style: c.style, art: `/landing/${key}.jpg`, fg: null };
  await sharp(file(c.art)).resize(768, 1024, { fit: "cover" }).jpeg({ quality: 84 }).toFile(`${OUT}/${key}.jpg`);
  if (c.fg) {
    await sharp(file(c.fg)).resize(768, 1024, { fit: "cover" }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(`${OUT}/${key}-fg.png`);
    out.fg = `/landing/${key}-fg.png`;
  }
  return out;
}

const legend = s.cards.find((c) => c.petId === pet.id && c.kind === "legendary");
const pick = ["sleep-1", "eat", "play", "social", "car", "odd", "walk", "you-2"];
const cards = [];
for (const slot of pick) {
  const c = s.cards.find((x) => x.petId === pet.id && x.slotId === slot);
  if (c?.art) cards.push(await card(c, `card-${slot}`));
}
const moods = {};
for (const [mood, frames] of Object.entries(pet.character.moods)) {
  moods[mood] = [];
  for (const [i, f] of frames.entries()) {
    const name = `char/${mood}-${i}.png`;
    await sharp(path.join(UP, f)).resize(480, 640).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(`${OUT}/${name}`);
    moods[mood].push(`/landing/${name}`);
  }
}
// the AI's picture of the pet at each level it has earned so far
const levels = [];
for (let l = 0; l <= 3; l++) {
  const r = await fetch(`http://localhost:${port}/api/likeness/${pet.id}?level=${l}`);
  fs.writeFileSync(`${OUT}/level-${l}.png`, Buffer.from(await r.arrayBuffer()));
  levels.push(`/landing/level-${l}.png`);
}
const styles = [];
for (const f of fs.readdirSync("data/styles").filter((f) => f.endsWith(".jpg") && !f.startsWith("_"))) {
  await sharp(`data/styles/${f}`).resize(480, 720, { fit: "cover" }).jpeg({ quality: 82 }).toFile(`${OUT}/styles/${f}`);
  styles.push({ key: f.replace(".jpg", ""), src: `/landing/styles/${f}` });
}
const manifest = { pet: { name: pet.name, breed: pet.breed }, legend: legend ? await card(legend, "legend") : null, cards, moods, levels, styles };
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log("cards", cards.length, "moods", Object.keys(moods).length, "levels", levels.length, "styles", styles.length);
