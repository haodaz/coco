import sharp from "sharp";
const file = process.argv[2];
const b64 = (await sharp(file).rotate().resize({width:1024,height:1024,fit:"inside"}).jpeg({quality:85}).toBuffer()).toString("base64");
const schema = { type:"object", additionalProperties:false, required:["species","breedCandidates","coat","marks","size"], properties:{
  species:{type:"string",enum:["dog","cat","bird","reptile","small_mammal","fish","other"]},
  breedCandidates:{type:"array",items:{type:"object",additionalProperties:false,required:["name","confidence"],properties:{name:{type:"string"},confidence:{type:"number"}}}},
  coat:{type:"string"}, marks:{type:"string"}, size:{type:"string"} } };
const t0 = Date.now();
const r = await fetch("https://api.meta.ai/v1/chat/completions", { method:"POST", headers:{Authorization:`Bearer ${(process.env.MODEL_API_KEY ?? process.env.META_API_KEY)}`,"Content-Type":"application/json"}, body: JSON.stringify({
  model:"muse-spark-1.3", max_tokens:2000,
  messages:[{role:"system",content:"You identify a pet from one photo. Appearance only: species, up to 3 breed guesses with confidence 0-1 summing to at most 1, coat, distinctive marks, size. No health judgments."},
    {role:"user",content:[{type:"text",text:"Who is this animal?"},{type:"image_url",image_url:{url:`data:image/jpeg;base64,${b64}`}}]}],
  response_format:{type:"json_schema",json_schema:{name:"identification",strict:true,schema}} })});
const j = await r.json();
console.log(r.status, Date.now()-t0, "ms");
console.log(j.choices?.[0]?.message?.content ?? JSON.stringify(j).slice(0,1500));
console.log(JSON.stringify(j.usage));
