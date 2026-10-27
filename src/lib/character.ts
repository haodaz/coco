import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { samPhrase } from "./finish";
import { editImage, petLayer } from "./meta";
import { photoBase64 } from "./photos";
import { newId, UPLOADS } from "./store";
import type { Pet, State } from "./types";

// The pet as a character: one base design learned from its photos, then a set of moods drawn from that base,
// each with a few frames that differ in one small thing (a blink, a tail wag) so they loop like a GIF.

export type Mood = "idle" | "happy" | "confused" | "thinking" | "close" | "busy";

const STYLE = "a polished 3D animated feature film style, soft studio lighting, slightly stylised proportions";

const MOODS: Record<Exclude<Mood, "idle">, string> = {
  happy: "mouth open in a happy smile, tongue out a little, eyes bright, tail up",
  confused: "head tilted to one side, ears perked, puzzled look",
  thinking: "eyes looking up and to the side as if remembering something, mouth closed, calm",
  close: "leaning forward toward the viewer with the chin resting low, soft loving half-closed eyes, as if leaning on someone it loves",
  busy: "lying down, carefully pushing through a small pile of photo cards with one paw, focused look",
};

// Extra frames per mood: one small change each, nothing else moves.
const FRAMES: Record<Mood, string[]> = {
  idle: ["the eyes are closed in a blink"],
  happy: ["the tail is raised to the other side, mid-wag", "the mouth is a little more open, tongue slightly further out"],
  confused: ["the eyes are closed in a blink"],
  thinking: ["the eyes look up to the other side"],
  close: ["the eyes are fully closed, content"],
  busy: ["the paw has moved a little further, pushing one card aside"],
};

// The whole body must be in the picture, with room around it, on a plain white backdrop that is easy to cut away.
const FRAME = "The entire body is in the picture, from the tips of the ears to the paws and tail, with clear empty space above the head and below the paws; nothing is cropped. Plain pure white background, no floor, no shadow.";

// Stand every mood on the same ground line: find where the paws end in the mood's first frame and move all its frames
// by the same amount, so a lying pose doesn't float and the frames of one mood stay aligned with each other.
const GROUND = 0.95;
export async function ground(files: string[]) {
  const first = await sharp(path.join(UPLOADS, files[0])).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = first.info;
  let bottom = 0;
  for (let y = height - 1; y >= 0 && !bottom; y--) for (let x = 0; x < width; x++) if (first.data[y * width + x] > 24) { bottom = y; break; }
  const shift = Math.round(height * GROUND) - bottom;
  if (!bottom || Math.abs(shift) < 4) return;
  await Promise.all(
    files.map(async (f) => {
      const file = path.join(UPLOADS, f);
      const img = sharp(await fs.readFile(file)).ensureAlpha();
      const moved = shift > 0
        ? img.extend({ top: shift, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).extract({ left: 0, top: 0, width, height })
        : img.extend({ top: 0, bottom: -shift, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).extract({ left: 0, top: -shift, width, height });
      await fs.writeFile(file, await moved.png().toBuffer());
    }),
  );
}

const ORDER: Mood[] = ["idle", "happy", "confused", "thinking", "close", "busy"];

// Each frame is cut out with SAM onto a transparent canvas of the same size for every frame,
// so the frames stay aligned and the character can stand anywhere on the page.
async function store(img: Buffer, phrase: string, extras: string[]) {
  const fitted = await sharp(img).resize(768, 1024, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
  const cut = await petLayer(fitted, phrase, extras, "character-cutout");
  const name = `${newId("art")}-char.png`;
  await fs.writeFile(path.join(UPLOADS, name), cut ?? (await sharp(fitted).png().toBuffer()));
  return name;
}

export async function makeCharacter(state: State, pet: Pet): Promise<NonNullable<Pet["character"]>> {
  // recent photos first: the character should look like the pet now, not as a puppy
  const photos = state.photos
    .filter((p) => p.petId === pet.id)
    .sort((a, b) => Number(b.id === pet.avatarPhotoId) - Number(a.id === pet.avatarPhotoId) || (b.takenAt ?? "").localeCompare(a.takenAt ?? ""))
    .slice(0, 4);
  const refs = await Promise.all(photos.map((p) => photoBase64(p.file)));
  const { coat, marks } = pet.appearance;
  const who = [pet.sex, pet.breed ?? pet.species].filter(Boolean).join(" ") + (coat ? `, ${coat}` : "") + (marks ? `, ${marks}` : "");

  const base = await editImage(
    "character",
    `All photos show the same animal, ${who}. Design it as a lovable game character in ${STYLE}. Sitting, facing the viewer, friendly and calm. ${FRAME} Keep its exact markings, coat, eye colour and ear shape. No text, no people.`,
    refs,
  );
  const baseB64 = base.toString("base64");
  const moods = await Promise.all(
    (Object.keys(MOODS) as (keyof typeof MOODS)[]).map(async (m) => [
      m,
      await editImage("character", `The first image is a game character. Draw the exact same character: same style, same proportions, same colours, same size in the frame, now ${MOODS[m]}. ${FRAME} No text, no people.`, [baseB64, refs[0]]),
    ] as const),
  );
  const firsts = new Map<Mood, Buffer>([["idle", base], ...moods]);
  const out = {} as Record<Mood, string[]>;
  await Promise.all(
    ORDER.map(async (m) => {
      const first = firsts.get(m)!;
      const extra = await Promise.all(
        FRAMES[m].map((change) =>
          editImage("character-frame", `Keep this image exactly the same: same character, same pose, same framing, same camera, same lighting, same background, same size and position. Change only one thing: ${change}. Nothing else moves.`, [first.toString("base64")]),
        ),
      );
      out[m] = await Promise.all([first, ...extra].map((f) => store(f, samPhrase(pet.species), m === "busy" ? ["photo cards", "toy", "clothing"] : ["toy", "clothing"])));
      await ground(out[m]);
    }),
  );
  return { style: "3d", moods: out, at: new Date().toISOString() };
}
