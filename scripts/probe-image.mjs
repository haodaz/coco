import sharp from "sharp";
import fs from "node:fs";
const [file, out, ...p] = process.argv.slice(2);
const b64 = (await sharp(file).rotate().resize({width:1024,height:1024,fit:"inside"}).jpeg({quality:85}).toBuffer()).toString("base64");
const t0 = Date.now();
const r = await fetch("https://api.meta.ai/v1/images/edits", { method:"POST", headers:{Authorization:`Bearer ${(process.env.MODEL_API_KEY ?? process.env.META_API_KEY)}`,"Content-Type":"application/json"}, body: JSON.stringify({
  model:"muse-image-1.0", n:1, prompt:p.join(" "), images:[{image_url:`data:image/jpeg;base64,${b64}`}] })});
const j = await r.json();
console.log(r.status, Date.now()-t0, "ms", JSON.stringify({...j, data: j.data?.map(d=>({...d, b64_json: d.b64_json?.length}))}).slice(0,800));
const d = j.data?.[0];
if (d?.b64_json) fs.writeFileSync(out, Buffer.from(d.b64_json, "base64"));
else if (d?.url) fs.writeFileSync(out, Buffer.from(await (await fetch(d.url)).arrayBuffer()));
