import exifr from "exifr";
import sharp from "sharp";
import { blurFaces, faceCheckHere } from "./faces";
import { getMedia, putMedia } from "./media";
import { newId } from "./store";
import type { Photo } from "./types";

// Every upload is stored as a JPEG, long side at most 1600 px (iPhone HEIC and big PNGs included),
// with its capture time when the file has one. Smaller images also keep model calls cheap.
// The browser prepares each photo first (src/lib/prepare.ts: faces blurred, capture time read) and says so in `meta`.
// Where this server can check faces itself (macOS), it blurs again; where it can't, it only takes prepared photos.

export type UploadMeta = { prepared?: boolean; faces?: number; takenAt?: string | null };

export function uploadMeta(raw: FormDataEntryValue | null): UploadMeta {
  try {
    const m = JSON.parse(String(raw ?? "{}"));
    return { prepared: m.prepared === true, faces: Number(m.faces) || 0, takenAt: typeof m.takenAt === "string" && !isNaN(Date.parse(m.takenAt)) ? m.takenAt : null };
  } catch {
    return {};
  }
}

export class NotPrepared extends Error {}

const isHeic = (name: string, type: string) => /heic|heif/i.test(type) || /\.(heic|heif)$/i.test(name);

export async function storePhoto(file: File, petId: string, slotId: string | null, meta: UploadMeta = {}): Promise<Photo> {
  if (!meta.prepared && !faceCheckHere()) throw new NotPrepared("photos must be prepared in the browser before upload");
  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  let takenAt: string | null = null;
  try {
    const exif = await exifr.parse(buf, ["DateTimeOriginal", "CreateDate"]);
    const d = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (d instanceof Date && !isNaN(d.getTime())) takenAt = d.toISOString();
  } catch {
    /* no EXIF: leave the time empty rather than guess */
  }
  if (isHeic(file.name, file.type)) {
    const { default: convert } = await import("heic-convert");
    buf = Buffer.from(await convert({ buffer: buf, format: "JPEG", quality: 0.9 }));
  }
  buf = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
  // faces are blurred here, before the photo is stored or sent anywhere; the original is not kept
  let faces = meta.faces ?? 0;
  if (faceCheckHere()) {
    const checked = await blurFaces(buf);
    buf = checked.jpeg;
    faces = Math.max(faces, checked.faces);
  }
  takenAt ??= meta.takenAt ?? null;
  const id = newId("ph");
  const name = await putMedia(`${id}.jpg`, buf);
  return { id, petId, file: name, originalName: file.name, takenAt, uploadedAt: new Date().toISOString(), slotId, facesBlurred: faces };
}

export async function readPhoto(file: string) {
  return getMedia(file);
}

export async function photoBase64(file: string) {
  return (await readPhoto(file)).toString("base64");
}
