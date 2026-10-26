import sharp from "sharp";
const b64 = (await sharp(process.argv[2]).rotate().resize({width:1024,height:1024,fit:"inside"}).jpeg({quality:85}).toBuffer()).toString("base64");
const r = await fetch("https://api.meta.ai/v1/responses", { method:"POST", headers:{Authorization:`Bearer ${process.env.META_API_KEY}`,"Content-Type":"application/json"}, body: JSON.stringify({
  model:"sam-3.1", stream:false,
  input:[{type:"message",role:"user",content:[{type:"input_text",text:process.argv[3]??"dog"},{type:"input_image",image_url:`data:image/jpeg;base64,${b64}`}]}] })});
const t = await r.text();
console.log(r.status, t.length);
console.log(t.slice(0,1200));
await import("node:fs").then(fs=>fs.writeFileSync("data/sam-out.txt", t));
