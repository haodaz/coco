// A dog's walk cycle as pose guides, built from how animators break it down (contact → down → pass → up on each side):
// the legs move left hind → left front → right hind → right front, a quarter cycle apart; a paw is on the ground about
// 60% of the time and swings forward low, folded at the wrist (front) or hock (hind); the pelvis drops after a hind paw
// lands and the chest rises as a front leg passes, so the back rocks gently and the head bobs a little.
// Writes one image per frame and a 4×2 sheet of all eight, which the painter turns into the pet's walk.
//
//   node scripts/walk-poses.mjs [outDir=public/poses]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = process.argv[2] ?? "public/poses";
fs.mkdirSync(out, { recursive: true });
const N = 8;
const W = 512, H = 512, GROUND = 430;
const STANCE = 0.62, STRIDE = 92, LIFT = 22;
// facing right; the far (left) legs are grey and behind the body
const LEGS = [
  { side: "L", hind: true, phase: 0.0 },
  { side: "L", hind: false, phase: 0.25 },
  { side: "R", hind: true, phase: 0.5 },
  { side: "R", hind: false, phase: 0.75 },
];

function paw(p) {
  if (p < STANCE) return { dx: STRIDE / 2 - (p / STANCE) * STRIDE, up: 0, swing: 0 };
  const t = (p - STANCE) / (1 - STANCE);
  const e = 0.5 - 0.5 * Math.cos(Math.PI * t);
  return { dx: -STRIDE / 2 + e * STRIDE, up: Math.sin(Math.PI * t) * LIFT, swing: Math.sin(Math.PI * t) };
}
function ik(a, b, from, to, bendBack) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const d = Math.min(Math.hypot(dx, dy), a + b - 0.5);
  const ang = Math.atan2(dy, dx);
  const k = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const s = bendBack ? -1 : 1;
  return [from[0] + a * Math.cos(ang + s * k), from[1] + a * Math.sin(ang + s * k)];
}
const line = (pts, col, w) => `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L")}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

function frame(f) {
  const p = f / N;
  // pelvis lowest just after a hind paw lands, chest highest as a front leg passes (half a beat apart)
  const pelvis = 6 * Math.cos((p - 0.08) * 4 * Math.PI);
  const chest = -5 * Math.cos((p - 0.33) * 4 * Math.PI);
  const hip = [190, 270 + pelvis], shoulder = [345, 262 + chest];
  const head = [430, 205 + chest * 1.4];
  const legSvg = (l) => {
    const q = (p + l.phase) % 1;
    const { dx, up, swing } = paw(q);
    const far = l.side === "L";
    const col = far ? "#a8a8a8" : "#2b2b2b", w = far ? 22 : 26;
    const off = far ? -8 : 6;
    if (l.hind) {
      // hip → knee (points forward) → hock → paw; the lower segment tilts back as the leg swings
      const root = [hip[0] + off, hip[1]];
      const hock = [root[0] + dx - 14 - swing * 10, GROUND - 46 - up];
      const knee = ik(78, 82, root, hock, false);
      const toe = [hock[0] + 14 - swing * 18, GROUND - up * 0.4 - swing * 4];
      return line([root, knee, hock, toe], col, w) + `<ellipse cx="${toe[0] + 9}" cy="${toe[1] - 3}" rx="15" ry="8" fill="${col}"/>`;
    }
    // shoulder → elbow (points back) → wrist → paw; the paw folds back under the wrist as the leg passes forward
    const root = [shoulder[0] + off, shoulder[1]];
    const wrist = [root[0] + dx, GROUND - 22 - up];
    const elbow = ik(82, 86, root, wrist, false);
    const fold = swing * 1.6; // radians the paw folds back
    const toe = [wrist[0] + Math.cos(Math.PI / 2 - 0.25 + fold) * 22, wrist[1] + Math.sin(Math.PI / 2 - 0.25 + fold) * 22];
    return line([root, elbow, wrist, toe], col, w) + `<ellipse cx="${toe[0] + 8}" cy="${toe[1] - 2}" rx="14" ry="7" fill="${col}"/>`;
  };
  const far = LEGS.filter((l) => l.side === "L").map(legSvg).join("");
  const near = LEGS.filter((l) => l.side === "R").map(legSvg).join("");
  const tailWag = Math.sin(p * 2 * Math.PI) * 10;
  const body =
    // torso: from the rump over the back to a deeper chest
    `<path d="M${hip[0] - 40},${hip[1] - 20} Q${(hip[0] + shoulder[0]) / 2},${(hip[1] + shoulder[1]) / 2 - 62} ${shoulder[0] + 30},${shoulder[1] - 40} Q${shoulder[0] + 55},${shoulder[1] + 25} ${shoulder[0] + 10},${shoulder[1] + 52} Q${(hip[0] + shoulder[0]) / 2},${(hip[1] + shoulder[1]) / 2 + 40} ${hip[0] - 10},${hip[1] + 36} Q${hip[0] - 55},${hip[1] + 20} ${hip[0] - 40},${hip[1] - 20}Z" fill="#3a3a3a"/>` +
    // neck and head, carried forward, a little above the back
    line([[shoulder[0] + 25, shoulder[1] - 25], head], "#3a3a3a", 54) +
    `<ellipse cx="${head[0]}" cy="${head[1]}" rx="44" ry="36" fill="#3a3a3a"/><ellipse cx="${head[0] + 42}" cy="${head[1] + 12}" rx="26" ry="16" fill="#3a3a3a"/>` +
    line([[head[0] - 14, head[1] - 22], [head[0] - 24, head[1] + 18]], "#555", 22) +
    // tail: out behind, swaying with the walk
    line([[hip[0] - 42, hip[1] - 14], [hip[0] - 85, hip[1] - 40 + tailWag], [hip[0] - 112, hip[1] - 52 + tailWag * 1.5]], "#3a3a3a", 16);
  return `<rect width="${W}" height="${H}" fill="#fff"/>${far}${body}${near}`;
}

const cells = [];
for (let f = 0; f < N; f++) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${frame(f)}</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(out, `walk-${f}.png`), png);
  cells.push(png);
}
// the sheet: 4 across, 2 down, read left to right, top to bottom
await sharp({ create: { width: W * 4, height: H * 2, channels: 3, background: "#ffffff" } })
  .composite(cells.map((input, i) => ({ input, left: (i % 4) * W, top: Math.floor(i / 4) * H })))
  .png()
  .toFile(path.join(out, "walk-sheet.png"));
console.log(`${N} walk poses and a sheet in ${out}`);
