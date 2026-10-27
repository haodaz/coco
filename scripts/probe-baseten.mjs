import fs from "node:fs";
import sharp from "sharp";
// Probe Muse Spark Open on Baseten: plain chat, structured output (json_schema), and an image.
const KEY = process.env.BASETEN_API_KEY;
const URL = "https://inference.baseten.co/v1/chat/completions";
const MODEL = "meta-models/muse-spark-open-1026";
async function call(body) {
  const t0 = Date.now();
  const r = await fetch(URL, { method: "POST", headers: { Authorization: `Api-Key ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: MODEL, ...body }) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ms: Date.now() - t0, j };
}
const a = await call({ messages: [{ role: "user", content: "Say hello in five words." }], max_tokens: 2000 });
const m = a.j.choices?.[0]?.message ?? {};
console.log("plain:", a.status, a.ms + "ms", "| content:", JSON.stringify(m.content)?.slice(0, 200), "| reasoning field:", Object.keys(m).join(","), "| usage:", JSON.stringify(a.j.usage), a.j.error ? JSON.stringify(a.j).slice(0, 300) : "");

const schema = { type: "object", additionalProperties: false, required: ["answer", "mood"], properties: { answer: { type: "string" }, mood: { type: "string", enum: ["happy", "close"] } } };
const b = await call({ messages: [{ role: "user", content: "You are a dog. In one sentence, what do you love?" }], max_tokens: 3000, response_format: { type: "json_schema", json_schema: { name: "a", strict: true, schema } } });
console.log("json_schema:", b.status, b.ms + "ms", "|", JSON.stringify(b.j.choices?.[0]?.message?.content)?.slice(0, 300), b.j.error ? JSON.stringify(b.j).slice(0, 300) : "");

const img = (await sharp("data/photos/IMG_7205.JPG").rotate().resize(768, 768, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer()).toString("base64");
const c = await call({ messages: [{ role: "user", content: [{ type: "text", text: "What animal is this, in five words?" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } }] }], max_tokens: 2000 });
console.log("image:", c.status, c.ms + "ms", "|", JSON.stringify(c.j.choices?.[0]?.message?.content)?.slice(0, 200), c.j.error ? JSON.stringify(c.j).slice(0, 300) : "");
fs.writeFileSync("data/baseten-probe.json", JSON.stringify({ a: a.j, b: b.j }, null, 1));
