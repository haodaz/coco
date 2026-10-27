import fs from "node:fs";
// How many objects SAM 3.1 finds in an image for each noun phrase.
const [file, ...phrases] = process.argv.slice(2);
const b = fs.readFileSync(file).toString("base64");
for (const text of phrases) {
  const r = await fetch("https://api.meta.ai/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${(process.env.MODEL_API_KEY ?? process.env.META_API_KEY)}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "sam-3.1", stream: false, input: [{ type: "message", role: "user", content: [{ type: "input_text", text }, { type: "input_image", image_url: `data:image/jpeg;base64,${b}` }] }] }) });
  const t = (await r.json()).output?.[0]?.content?.[0]?.text ?? "";
  console.log(text.padEnd(18), (t.match(/<\|box;[^|]*\|>/g) ?? []).join(" ") || "none");
}
