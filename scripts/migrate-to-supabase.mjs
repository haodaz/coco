import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
// One-off: move the local state (data/state.json) and every file it refers to (data/uploads) into a signed-up
// user's account on Supabase. The user must have signed in once. Usage: node scripts/migrate-to-supabase.mjs you@example.com
const email = process.argv[2];
if (!email) throw new Error("usage: node scripts/migrate-to-supabase.mjs <email of the account>");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let user = null;
for (let page = 1; !user; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (data.users.length < 200) break;
}
if (!user) throw new Error(`no account for ${email}; sign in once on the site first`);

const state = JSON.parse(fs.readFileSync("data/state.json", "utf8"));
const existing = await db.from("app_state").select("version").eq("user_id", user.id).maybeSingle();
if (existing.data) throw new Error("this account already has data; not overwriting it");

// every file the state points at: photos, card art and depth layers, the AI's portrait, character frames
const files = new Set();
for (const p of state.photos) files.add(p.file);
for (const c of state.cards) for (const u of [c.art, c.fg]) if (u) files.add(u.replace("/api/art/", "").replace(/\?.*$/, ""));
for (const pet of state.pets) {
  if (pet.likeness?.file) files.add(pet.likeness.file);
  for (const frames of Object.values(pet.character?.moods ?? {})) for (const f of frames) files.add(f);
}
let n = 0;
for (const f of files) {
  const local = path.join("data/uploads", f);
  if (!fs.existsSync(local)) { console.log("missing locally:", f); continue; }
  const type = f.endsWith(".png") ? "image/png" : "image/jpeg";
  const { error } = await db.storage.from("media").upload(`${user.id}/${f}`, fs.readFileSync(local), { contentType: type, upsert: true });
  if (error) throw new Error(`${f}: ${error.message}`);
  n++;
}
const { error } = await db.from("app_state").insert({ user_id: user.id, state, version: 1 });
if (error) throw error;
console.log(`moved ${state.pets.length} pet(s), ${state.cards.length} cards, ${n} files to ${email}`);
