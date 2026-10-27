import type { Pattern } from "@/lib/species";

// Face-down quest card: each category has its own pattern and colour, so the empty set already looks collectible.

const THEME: Record<Pattern, { bg: string; fg: string; accent: string }> = {
  moon: { bg: "#1e2a5a", fg: "#c9d4ff", accent: "#ffd76a" },
  bowl: { bg: "#7a3e1d", fg: "#ffd9b8", accent: "#ffb15c" },
  ball: { bg: "#1f5e4a", fg: "#bff0dc", accent: "#ffe066" },
  hearts: { bg: "#8a2e4f", fg: "#ffd0de", accent: "#ff8fab" },
  path: { bg: "#4d5a23", fg: "#e6f0b8", accent: "#c9e265" },
  wind: { bg: "#23506e", fg: "#cce9ff", accent: "#7fd1ff" },
  circles: { bg: "#5b3a7a", fg: "#e6d4ff", accent: "#c79bff" },
  mystery: { bg: "#2a2a33", fg: "#d8d8e8", accent: "#f5c542" },
  leaf: { bg: "#2f5d34", fg: "#d4f0cf", accent: "#9be08f" },
  sun: { bg: "#5b3fb0", fg: "#ffeac2", accent: "#ffc94a" },
  waves: { bg: "#174a63", fg: "#c8ecff", accent: "#5fd0ff" },
  nest: { bg: "#5e4630", fg: "#f2e2cf", accent: "#e0b07a" },
};

function Motif({ p, c }: { p: Pattern; c: string }) {
  switch (p) {
    case "moon":
      return <><path d="M14 6a8 8 0 1 0 8 11 6 6 0 1 1-8-11z" fill={c} /><circle cx="30" cy="28" r="1.4" fill={c} /><circle cx="6" cy="30" r="1" fill={c} /></>;
    case "bowl":
      return <><path d="M6 18h24a12 6 0 0 1-24 0z" fill={c} /><rect x="13" y="8" width="10" height="4" rx="2" fill={c} /><circle cx="12" cy="10" r="2.4" fill={c} /><circle cx="24" cy="10" r="2.4" fill={c} /></>;
    case "ball":
      return <><circle cx="18" cy="18" r="8" fill="none" stroke={c} strokeWidth="2" /><path d="M10.5 15c5 2 10 2 15 0M10.5 21c5-2 10-2 15 0" stroke={c} strokeWidth="1.6" fill="none" /></>;
    case "hearts":
      return <><path d="M18 27s-9-5.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-9 11-9 11z" fill={c} /></>;
    case "path":
      return <>{[[8, 26], [14, 18], [22, 14], [28, 6]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="2.6" ry="3.2" fill={c} /><circle cx={x - 2.6} cy={y - 4} r="1" fill={c} /><circle cx={x} cy={y - 5} r="1" fill={c} /><circle cx={x + 2.6} cy={y - 4} r="1" fill={c} /></g>)}</>;
    case "wind":
      return <><path d="M4 12h18a4 4 0 1 0-4-4M4 20h24a4 4 0 1 1-4 4M4 28h12" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" /></>;
    case "circles":
      return <><circle cx="13" cy="18" r="6" fill="none" stroke={c} strokeWidth="2" /><circle cx="23" cy="18" r="6" fill="none" stroke={c} strokeWidth="2" /></>;
    case "mystery":
      return <><path d="M14 12a4 4 0 1 1 6 3.5c-1.5.9-2 1.6-2 3.5" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" /><circle cx="18" cy="24" r="1.5" fill={c} /><path d="M29 6l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill={c} /></>;
    case "leaf":
      return <><path d="M8 28C8 14 18 8 30 8c0 12-8 20-22 20z" fill={c} /><path d="M10 26L26 12" stroke="#00000033" strokeWidth="1.2" /></>;
    case "sun":
      return <><circle cx="18" cy="18" r="5" fill={c} />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="18" y1="18" x2={18 + 11 * Math.cos((a * Math.PI) / 180)} y2={18 + 11 * Math.sin((a * Math.PI) / 180)} stroke={c} strokeWidth="1.6" strokeDasharray="0 7 4" />)}</>;
    case "waves":
      return <><path d="M2 14c4-4 8 4 12 0s8 4 12 0 8 4 8 0M2 24c4-4 8 4 12 0s8 4 12 0 8 4 8 0" stroke={c} strokeWidth="2" fill="none" /></>;
    case "nest":
      return <><path d="M6 20c4 6 20 6 24 0" stroke={c} strokeWidth="2.4" fill="none" /><ellipse cx="18" cy="16" rx="4" ry="5" fill={c} /></>;
  }
}

export default function CardBack({ pattern, title, index }: { pattern: Pattern; title: string; index: number }) {
  const t = THEME[pattern];
  const id = `pat-${pattern}-${index}`;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: t.bg, boxShadow: `inset 0 0 0 3px ${t.accent}55` }}>
      <svg className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <g opacity="0.28"><Motif p={pattern} c={t.fg} /></g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <div className="absolute inset-3 rounded-xl border" style={{ borderColor: `${t.accent}88` }} />
      <div className="relative flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <svg width="56" height="56" viewBox="0 0 36 36" aria-hidden><Motif p={pattern} c={t.accent} /></svg>
        <div className="text-[13px] font-semibold leading-snug" style={{ color: t.fg }}>{title}</div>
        <div className="text-[11px] tracking-wide" style={{ color: `${t.fg}bb` }}>No. {String(index + 1).padStart(2, "0")}</div>
      </div>
    </div>
  );
}
