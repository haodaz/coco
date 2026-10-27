import fs from "node:fs";
import sharp from "sharp";
import convert from "heic-convert";
// Candidate hero images for the landing page: a world grown from the memories of one pet and its person.
// Usage: node scripts/probe-hero.mjs <outDir> <refPhoto>...
const [out, ...photos] = process.argv.slice(2);
const dog = "the black Labrador Retriever from the reference photos (solid glossy black coat, amber-brown eyes, soft drop ears)";
const IDEAS = {
  island: `A small floating island in a soft dawn sky, built from layered memory cards and instant photos of ${dog}. On top, a person seen only from behind sits with the dog leaning against them, both watching the light. Dreamy, warm, painterly, gentle glow, lots of open sky.`,
  tree: `A glowing tree whose leaves are hundreds of tiny memory cards and instant photos, softly lit at golden hour. Under it ${dog} sleeps curled up beside a person seen only from behind, sitting in the grass. Dreamy, tender, painterly, warm light.`,
  stars: `Night on a quiet hill. Memory cards drift up like paper lanterns and gather into a constellation shaped like ${dog}. A person seen only from behind sits on the hill with the dog beside them, both looking up. Deep blue and warm gold, dreamy, painterly.`,
  globe: `A small glass sphere holding a tiny miniature world made of one dog's real places: the floor beside a bed with a white blanket, a car window with trees passing, a wooden bench by a marina, a park path, a grey rope toy. In the middle sits ${dog}, small and content. Soft morning light, dreamy, tender, detailed miniature, painterly.`,
};
const load = async (f) => {
  let b = fs.readFileSync(f);
  if (/heic$/i.test(f)) b = Buffer.from(await convert({ buffer: b, format: "JPEG", quality: 0.9 }));
  return (await sharp(b).rotate().resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer()).toString("base64");
};
const refs = await Promise.all(photos.map(load));
fs.mkdirSync(out, { recursive: true });
await Promise.all(
  Object.entries(IDEAS).map(async ([k, prompt]) => {
    const r = await fetch("https://api.meta.ai/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY ?? process.env.META_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "muse-image-1.0", n: 1, prompt: `${prompt} The photos are only to learn what the dog looks like. No faces of people, no text.`, images: refs.map((b) => ({ image_url: `data:image/jpeg;base64,${b}` })) }),
    });
    const j = await r.json();
    if (!j.data?.[0]?.b64_json) return console.log(k, JSON.stringify(j).slice(0, 200));
    await sharp(Buffer.from(j.data[0].b64_json, "base64")).jpeg({ quality: 90 }).toFile(`${out}/${k}.jpg`);
    console.log(k, "ok");
  }),
);
const names = Object.keys(IDEAS).filter((k) => fs.existsSync(`${out}/${k}.jpg`));
const tiles = await Promise.all(names.map((k) => sharp(`${out}/${k}.jpg`).resize(420, 420, { fit: "cover" }).toBuffer()));
await sharp({ create: { width: 2 * 430 + 10, height: Math.ceil(names.length / 2) * 430 + 10, channels: 3, background: "#fff" } })
  .composite(tiles.map((t, i) => ({ input: t, left: 10 + (i % 2) * 430, top: 10 + Math.floor(i / 2) * 430 })))
  .jpeg()
  .toFile(`${out}/_sheet.jpg`);
