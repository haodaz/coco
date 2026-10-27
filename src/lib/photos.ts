import { promises as fs } from "node:fs";
import path from "node:path";
import exifr from "exifr";
import sharp from "sharp";
import { blurFaces } from "./faces";
import { UPLOADS, newId } from "./store";
import type { Photo } from "./types";

// Every upload is stored as a JPEG, long side at most 1600 px (iPhone HEIC and big PNGs included),
// with its capture time when the file has one. Smaller images also keep model calls cheap.

const isHeic = (name: string, type: string) => /heic|heif/i.test(type) || /\.(heic|heif)$/i.test(name);

export async function storePhoto(file: File, petId: string, slotId: string | null): Promise<Photo> {
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
  const { jpeg, faces } = await blurFaces(buf);
  buf = jpeg;
  await fs.mkdir(UPLOADS, { recursive: true });
  const id = newId("ph");
  const name = `${id}.jpg`;
  await fs.writeFile(path.join(UPLOADS, name), buf);
  return { id, petId, file: name, originalName: file.name, takenAt, uploadedAt: new Date().toISOString(), slotId, facesBlurred: faces };
}

export async function readPhoto(file: string) {
  return fs.readFile(path.join(UPLOADS, path.basename(file)));
}

export async function photoBase64(file: string) {
  return (await readPhoto(file)).toString("base64");
}
