// Narration via OpenAI gpt-4o-mini-tts (the fallback when DashScope is out): writes tts/<id>.wav and
// tts/durations.json, same shapes as tts.mjs. Key read from programcrawler/.env.local (OPENAI_API_KEY).
//   FFMPEG=<ffmpeg> node tts-openai.mjs [voice=nova]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const env = Object.fromEntries(fs.readFileSync('/Users/aisandbox/Documents/programcrawler/.env.local', 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const KEY = env.OPENAI_API_KEY;
const F = process.env.FFMPEG;
const VOICE = process.argv[2] || 'nova';
const segs = JSON.parse(fs.readFileSync('narration.json', 'utf8'));
fs.mkdirSync('tts', { recursive: true });
const durOf = (f) => { try { execFileSync(F, ['-i', f], { stdio: 'pipe' }); } catch (e) { const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(e.stderr.toString()); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : 0; } return 0; };
const out = [];
for (const s of segs) {
  const f = `tts/${s.id}.wav`;
  if (!fs.existsSync(f)) {
    const r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: VOICE, input: s.text, response_format: 'wav', speed: 0.95, instructions: 'A calm, warm narrator for a short product video about a pet app. Medium-slow pace, natural and plain, like telling a friend; not a broadcaster, no hype.' }) });
    if (!r.ok) { console.log('fail', s.id, r.status, (await r.text()).slice(0, 200)); continue; }
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  const dur = durOf(f); out.push({ id: s.id, dur }); console.log(s.id, dur.toFixed(2) + 's');
}
fs.writeFileSync('tts/durations.json', JSON.stringify(out));
console.log('total', out.reduce((a, b) => a + b.dur, 0).toFixed(1) + 's');
