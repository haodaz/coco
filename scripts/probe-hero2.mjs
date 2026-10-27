import fs from "node:fs";
import sharp from "sharp";
// Two more hero slides, in the same dreamy painterly light as the island and the stars:
// memory cards gathering into an animal (a cat this time, not a dog), and a blind box opening onto cards.
const out = process.argv[2] ?? "data/hero";
const STYLE = "Dreamy, warm, painterly, soft glowing light, gentle pastel sky tones, lots of air around the subject. No text, no people's faces.";
const IDEAS = {
  cat: `Hundreds of small collectible memory cards and instant photos of one tabby cat swirl through the air and gather into the shape of that cat sitting calmly, as if the cat is made of its own memories; the last few cards are still flying in to complete it. ${STYLE}`,
  box: `Two hands open a small glowing blind box; out of it fans a stack of shimmering collectible cards, each a painted portrait of someone's pet (a tabby cat, a green parrot, a small turtle, a black dog, a white rabbit), bursting out with sparkles and light. A moment of joyful surprise. ${STYLE}`,
};
fs.mkdirSync(out, { recursive: true });
await Promise.all(
  Object.entries(IDEAS).map(async ([k, prompt]) => {
    for (let v = 1; v <= 2; v++) {
      const r = await fetch("https://api.meta.ai/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY ?? process.env.META_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "muse-image-1.0", n: 1, prompt }),
      });
      const j = await r.json();
      if (!j.data?.[0]?.b64_json) { console.log(k, v, JSON.stringify(j).slice(0, 200)); continue; }
      await sharp(Buffer.from(j.data[0].b64_json, "base64")).jpeg({ quality: 90 }).toFile(`${out}/${k}-${v}.jpg`);
      console.log(k, v, "ok");
    }
  }),
);
const names = ["cat-1", "cat-2", "box-1", "box-2"].filter((k) => fs.existsSync(`${out}/${k}.jpg`));
const tiles = await Promise.all(names.map((k) => sharp(`${out}/${k}.jpg`).resize(420, 420, { fit: "cover" }).toBuffer()));
await sharp({ create: { width: 870, height: 870, channels: 3, background: "#fff" } })
  .composite(tiles.map((t, i) => ({ input: t, left: 10 + (i % 2) * 430, top: 10 + Math.floor(i / 2) * 430 })))
  .jpeg()
  .toFile(`${out}/_sheet2.jpg`);
