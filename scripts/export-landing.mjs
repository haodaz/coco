import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
// Copies the real pet's cards, character and portraits from local data into public/landing, so the landing page
// shows them on any clone (data/ is git-ignored). Run with the dev server up: node scripts/export-landing.mjs [port]
const port = process.argv[2] ?? "3030";
const s = JSON.parse(fs.readFileSync("data/state.json", "utf8"));
const pet = s.pets[0];
const FINAL = "public/landing";
const OUT = "public/landing.next"; // built aside, swapped in at the end, so the running site never loses its manifest
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
  if (!r.ok || r.headers.get("content-type") !== "image/png") throw new Error(`level ${l}: the dev server answered ${r.status} ${r.headers.get("content-type")}; is it running on port ${port}?`);
  fs.writeFileSync(`${OUT}/level-${l}.png`, Buffer.from(await r.arrayBuffer()));
  levels.push(`/landing/level-${l}.png`);
}
const styles = [];
for (const f of fs.readdirSync("data/styles").filter((f) => f.endsWith(".jpg") && !f.startsWith("_"))) {
  await sharp(`data/styles/${f}`).resize(480, 720, { fit: "cover" }).jpeg({ quality: 82 }).toFile(`${OUT}/styles/${f}`);
  styles.push({ key: f.replace(".jpg", ""), src: `/landing/styles/${f}` });
}
// the whole starter set, small
fs.mkdirSync(`${OUT}/set`, { recursive: true });
const set = [];
for (const c of s.cards.filter((x) => x.petId === pet.id && x.kind === "quest")) {
  await sharp(file(c.art)).resize(240, 320, { fit: "cover" }).jpeg({ quality: 78 }).toFile(`${OUT}/set/${c.slotId}.jpg`);
  set.push({ slot: c.slotId, name: c.name, rarity: c.rarity, src: `/landing/set/${c.slotId}.jpg` });
}
// one Memory Print in full: what the photo showed, what the owner said, the traces, the day
const mp = s.cards.find((x) => x.petId === pet.id && x.note?.text);
const mpPhoto = mp && s.photos.find((p) => p.id === mp.photoId);
const memoryPrint = mp && {
  card: await card(mp, "memory-print"),
  observation: mp.observation,
  said: mp.note.text,
  traces: s.traces.filter((t) => (t.source.type === "photo" && t.source.photoId === mp.photoId) || (t.source.type === "note" && t.source.noteId === mp.id)).map((t) => ({ kind: t.kind, label: t.label, detail: t.detail, owner: t.source.type === "note" })),
  day: mpPhoto?.takenAt?.slice(0, 10) ?? null,
};
const manifest = { pet: { name: pet.name, breed: pet.breed }, legend: legend ? await card(legend, "legend") : null, cards, moods, levels, styles, set, memoryPrint };
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
fs.rmSync(FINAL, { recursive: true, force: true });
fs.renameSync(OUT, FINAL);
console.log("cards", cards.length, "moods", Object.keys(moods).length, "levels", levels.length, "styles", styles.length);
