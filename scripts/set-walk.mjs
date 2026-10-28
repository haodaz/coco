// Give a pet a hand-picked walk: upload frames (in order, already fitted to the character canvas) and set them as the
// pet's walk on the hosted app. Without --apply it only shows which pet would change.
//
//   node scripts/set-walk.mjs <framesDir> <petName> [--apply]
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const [dir, petName] = process.argv.slice(2);
const apply = process.argv.includes("--apply");
if (!dir || !petName) throw new Error("usage: node scripts/set-walk.mjs <framesDir> <petName> [--apply]");
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const frames = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
if (frames.length < 6) throw new Error(`need at least 6 frames, found ${frames.length}`);

const { data: rows, error } = await db.from("app_state").select("user_id, state, version");
if (error) throw error;
const hits = rows.flatMap((r) => (r.state?.pets ?? []).filter((p) => p.name === petName && p.character).map((p) => ({ r, p })));
console.log(`${hits.length} pet(s) named ${petName} with a character; ${frames.length} frames`);
for (const { r, p } of hits) console.log(`  user ${r.user_id.slice(0, 8)}… pet ${p.id}: walk now ${p.character.moods.walk?.length ?? 0} frames`);
if (!apply || hits.length !== 1) {
  if (apply) console.log("not applied: expected exactly one pet");
  process.exit(0);
}

const { r, p } = hits[0];
const stamp = Date.now().toString(36);
const names = [];
for (const [i, f] of frames.entries()) {
  const name = `art_walk${stamp}${i}-char.png`;
  const { error: e } = await db.storage.from("media").upload(`${r.user_id}/${name}`, fs.readFileSync(path.join(dir, f)), { contentType: "image/png", upsert: true });
  if (e) throw e;
  names.push(name);
}
// saved only if nobody saved in between, like the app does
const fresh = (await db.from("app_state").select("state, version").eq("user_id", r.user_id).single()).data;
const pet = fresh.state.pets.find((x) => x.id === p.id);
pet.character.moods.walk = names;
pet.character.at = new Date().toISOString();
const { data: done, error: e2 } = await db.from("app_state").update({ state: fresh.state, version: fresh.version + 1, updated_at: new Date().toISOString() }).eq("user_id", r.user_id).eq("version", fresh.version).select("version");
if (e2 || !done?.length) throw new Error(`not saved (someone saved in between?) ${e2?.message ?? ""}`);
console.log(`walk set: ${names.length} frames`);
