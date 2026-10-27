import { promises as fs } from "node:fs";
import path from "node:path";
import { currentUserId } from "./session";
import { UPLOADS } from "./store";
import { adminClient, HOSTED } from "./supabase";

// Photos and paintings. Hosted: Supabase Storage, private bucket "media", one folder per user.
// Local: data/uploads. File names never carry a path; the user's folder comes from the request's scope.

const BUCKET = "media";
const clean = (name: string) => path.basename(name.replace(/\?.*$/, ""));
const typeOf = (name: string) => (name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg");

export async function putMedia(name: string, data: Buffer) {
  const file = clean(name);
  if (!HOSTED) {
    await fs.mkdir(UPLOADS, { recursive: true });
    await fs.writeFile(path.join(UPLOADS, file), data);
    return file;
  }
  const { error } = await adminClient().storage.from(BUCKET).upload(`${currentUserId()}/${file}`, data, { contentType: typeOf(file), upsert: true });
  if (error) throw new Error(`store ${file}: ${error.message}`);
  return file;
}

export async function getMedia(name: string): Promise<Buffer> {
  const file = clean(name);
  if (!HOSTED) return fs.readFile(path.join(UPLOADS, file));
  const { data, error } = await adminClient().storage.from(BUCKET).download(`${currentUserId()}/${file}`);
  if (error || !data) throw new Error(`read ${file}: ${error?.message ?? "missing"}`);
  return Buffer.from(await data.arrayBuffer());
}

export const mediaType = typeOf;
