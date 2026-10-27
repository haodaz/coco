import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

// People's faces never leave this machine. Every photo is checked with Apple's Vision framework (tools/faces.swift)
// before it is stored, and any face is blurred out; only the blurred copy is kept and sent to models.

const run = promisify(execFile);
const BIN = path.join(process.cwd(), "data", "bin", "faces");
const SRC = path.join(process.cwd(), "tools", "faces.swift");

type Box = { x: number; y: number; w: number; h: number };

// The on-device check needs macOS (Vision + swiftc). Elsewhere (Vercel) the browser has already blurred faces.
export const faceCheckHere = () => process.platform === "darwin";

async function detector() {
  try {
    await fs.access(BIN);
  } catch {
    await fs.mkdir(path.dirname(BIN), { recursive: true });
    await run("swiftc", ["-O", SRC, "-o", BIN]); // first run on this machine: build the detector (~10 s)
  }
  return BIN;
}

export async function findFaces(jpeg: Buffer): Promise<Box[]> {
  const tmp = path.join(os.tmpdir(), `coco-face-${process.pid}-${Date.now()}.jpg`);
  await fs.writeFile(tmp, jpeg);
  try {
    const { stdout } = await run(await detector(), [tmp]);
    return JSON.parse(stdout) as Box[];
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

// Blur each face with room around it (hair, ears, chin), in a soft oval so it doesn't look like a sticker.
export async function blurFaces(jpeg: Buffer): Promise<{ jpeg: Buffer; faces: number }> {
  const boxes = await findFaces(jpeg);
  if (!boxes.length) return { jpeg, faces: 0 };
  const { width: W = 0, height: H = 0 } = await sharp(jpeg).metadata();
  const layers = await Promise.all(
    boxes.map(async (b) => {
      const mx = b.w * 0.45, my = b.h * 0.55;
      const left = Math.max(0, Math.floor((b.x - mx) * W));
      const top = Math.max(0, Math.floor((b.y - my) * H));
      const width = Math.min(W - left, Math.ceil((b.w + 2 * mx) * W));
      const height = Math.min(H - top, Math.ceil((b.h + 2 * my) * H));
      const blurred = await sharp(jpeg).extract({ left, top, width, height }).blur(Math.max(12, width / 6)).toBuffer();
      const oval = Buffer.from(`<svg width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="#fff"/></svg>`);
      const masked = await sharp(blurred).composite([{ input: oval, blend: "dest-in" }]).png().toBuffer();
      return { input: masked, left, top };
    }),
  );
  return { jpeg: await sharp(jpeg).composite(layers).jpeg({ quality: 86 }).toBuffer(), faces: boxes.length };
}
