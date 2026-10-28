"use client";

// Every photo is prepared in the browser before it is uploaded: its capture time is read, HEIC becomes JPEG,
// it is turned upright and made smaller, and every human face is blurred. Only that copy leaves the device.
// Face detection is MediaPipe's BlazeFace, served from this site (public/mediapipe, public/models). BlazeFace also
// fires on some pets' faces (a corgi looking at the camera), so when it finds a face, an object detector checks
// what it is on: a face on an animal and on no person is the pet, and stays sharp.

import type { FaceDetector, ObjectDetector } from "@mediapipe/tasks-vision";

const MAX = 1600;
let detector: Promise<FaceDetector> | null = null;

function faceDetector() {
  detector ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("/mediapipe");
    return FaceDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/models/blaze_face_short_range.tflite" },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.4,
    });
  })();
  return detector;
}

let objects: Promise<ObjectDetector> | null = null;
function objectDetector() {
  objects ??= (async () => {
    const { ObjectDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks("/mediapipe");
    return ObjectDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: "/models/efficientdet_lite0.tflite" },
      runningMode: "IMAGE",
      scoreThreshold: 0.3,
    });
  })();
  return objects;
}
const ANIMALS = new Set(["dog", "cat", "bird", "horse", "sheep", "cow", "bear", "teddy bear"]);
type Box = { originX: number; originY: number; width: number; height: number };
const holds = (o: Box, x: number, y: number) => x >= o.originX && x <= o.originX + o.width && y >= o.originY && y <= o.originY + o.height;

// the faces that belong to people: drop any whose centre is on an animal and on no person
async function peoplesFaces(canvas: HTMLCanvasElement, faces: Box[]): Promise<Box[]> {
  if (!faces.length) return faces;
  try {
    const found = (await objectDetector()).detect(canvas).detections;
    const boxes = (names: (n: string) => boolean) => found.filter((d) => d.boundingBox && names(d.categories[0]?.categoryName ?? "")).map((d) => d.boundingBox!);
    const people = boxes((n) => n === "person"), animals = boxes((n) => ANIMALS.has(n));
    return faces.filter((f) => {
      const x = f.originX + f.width / 2, y = f.originY + f.height / 2;
      return people.some((o) => holds(o, x, y)) || !animals.some((o) => holds(o, x, y));
    });
  } catch {
    return faces; // when in doubt, blur
  }
}

const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

async function takenAt(f: File): Promise<string | null> {
  try {
    const { default: exifr } = await import("exifr");
    const e = await exifr.parse(f, ["DateTimeOriginal", "CreateDate"]);
    const d = e?.DateTimeOriginal ?? e?.CreateDate;
    return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

export type Prepared = { file: File; faces: number; takenAt: string | null };

export async function preparePhoto(input: File): Promise<Prepared> {
  const when = await takenAt(input);
  let blob: Blob = input;
  if (isHeic(input)) {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: input, toType: "image/jpeg", quality: 0.92 });
    blob = Array.isArray(out) ? out[0] : out;
  }
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // find faces, then blur each in a soft oval with room for hair, ears and chin
  const found = await peoplesFaces(canvas, (await faceDetector()).detect(canvas).detections.map((d) => d.boundingBox).filter((b) => !!b));
  if (found.length) {
    const copy = document.createElement("canvas");
    copy.width = w;
    copy.height = h;
    copy.getContext("2d")!.drawImage(canvas, 0, 0);
    for (const b of found) {
      const mx = b.width * 0.45, my = b.height * 0.55;
      const cx = b.originX + b.width / 2, cy = b.originY + b.height / 2;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, b.width / 2 + mx, b.height / 2 + my, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = `blur(${Math.max(12, (b.width + 2 * mx) / 6)}px)`;
      ctx.drawImage(copy, 0, 0);
      ctx.restore();
    }
  }
  const jpeg = await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), "image/jpeg", 0.86));
  const name = input.name.replace(/\.[^.]+$/, "") + ".jpg";
  return { file: new File([jpeg], name, { type: "image/jpeg" }), faces: found.length, takenAt: when };
}

// Adds a prepared photo to a form under `field`, with what the server needs to trust it.
export async function appendPhoto(fd: FormData, field: string, input: File) {
  const p = await preparePhoto(input);
  fd.append(field, p.file);
  fd.append(`${field}Meta`, JSON.stringify({ prepared: true, faces: p.faces, takenAt: p.takenAt }));
  return p;
}
