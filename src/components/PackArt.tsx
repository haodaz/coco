import { CocoMark } from "@/components/Brand";

// A sealed booster pack, drawn (no picture of foil): crimped top and bottom, the coco mark printed at the top,
// a window with a little crowd of animals (the same on every pack, whoever's pet it is), and the series along the bottom. Three series, so a pack says what's inside
// before it is opened: the Starter Kit, the Daily Booster, and Special packs (move cards).

export type PackKind = "starter" | "booster" | "special";

const SERIES: Record<PackKind, { name: string; bg: string; ink: string; accent: string; window: string }> = {
  starter: {
    name: "Starter Kit",
    bg: "linear-gradient(165deg, #1b8f95 0%, #2fb5a4 50%, #7ad9b0 100%)",
    ink: "#fff",
    accent: "#ffd27a",
    window: "radial-gradient(closest-side, rgba(255,255,255,.95), rgba(214,248,236,.75) 60%, rgba(214,248,236,0))",
  },
  booster: {
    name: "Daily Booster",
    bg: "linear-gradient(165deg, #6f6cf2 0%, #a26cf0 48%, #f287bd 100%)",
    ink: "#fff",
    accent: "#ffd6ec",
    window: "radial-gradient(closest-side, rgba(255,255,255,.95), rgba(236,228,255,.75) 60%, rgba(236,228,255,0))",
  },
  special: {
    name: "Special",
    bg: "linear-gradient(165deg, #14112a 0%, #2a1f55 55%, #3d2470 100%)",
    ink: "#fff",
    accent: "#f5d27a",
    window: "radial-gradient(closest-side, rgba(255,240,200,.9), rgba(180,150,255,.45) 60%, rgba(180,150,255,0))",
  },
};

const CROWD: { src: string; style: React.CSSProperties }[] = [
  { src: "/ws/assets/parrot.png", style: { height: "40%", left: "8%", top: "2%", transform: "rotate(-8deg)" } },
  { src: "/ws/assets/cat.png", style: { height: "62%", left: "-2%", bottom: "6%" } },
  { src: "/ws/assets/rabbit.png", style: { height: "62%", right: "-2%", bottom: "6%" } },
  { src: "/ws/assets/corgi.png", style: { height: "78%", left: "50%", bottom: "0%", transform: "translateX(-50%)" } },
  { src: "/ws/assets/turtle.png", style: { height: "22%", right: "6%", bottom: "-2%" } },
];

// crimped edges: small teeth along the top and bottom
const TEETH = 18;
const DEPTH = 1.4; // % of the height
const crimp = (() => {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= TEETH * 2; i++) {
    const x = (i / (TEETH * 2)) * 100;
    top.push(`${x}% ${i % 2 ? DEPTH : 0}%`);
    bottom.unshift(`${x}% ${100 - (i % 2 ? DEPTH : 0)}%`);
  }
  return `polygon(${[...top, ...bottom].join(",")})`;
})();

export default function PackArt({
  kind,
  art,
  title,
  sub,
  badge,
  sealed = false,
  className = "",
}: {
  kind: PackKind;
  art?: string | null; // the pet in the window
  title?: string; // big line under the window ("3 Memory Prints")
  sub?: string; // small line
  badge?: string; // corner badge ("3 cards")
  sealed?: boolean; // being painted: the pack wobbles
  className?: string;
}) {
  const s = SERIES[kind];
  return (
    <div className={`pack-art relative aspect-[5/8] [container-type:inline-size] ${sealed ? "pack-wobble" : ""} ${className}`}>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: crimp, background: s.bg }}>
        {/* foil: a quiet pattern of marks, a holographic shimmer for Special, and a light sweep */}
        <div className="pack-pattern absolute inset-0 opacity-[.13]" />
        {kind === "special" && <div className="pack-holo absolute inset-0" />}
        <div className="pack-sweep absolute -inset-[40%]" />
        {/* crimp bands */}
        <div className="pack-crimp absolute inset-x-0 top-0 h-[7%]" />
        <div className="pack-crimp absolute inset-x-0 bottom-0 h-[7%]" />
        {/* edge seams */}
        <div className="absolute inset-y-[7%] left-[3%] w-px bg-white/25" />
        <div className="absolute inset-y-[7%] right-[3%] w-px bg-white/25" />

        {/* the brand, always in the same place */}
        <div className="absolute inset-x-0 top-[9.5%] flex items-center justify-center gap-[1.6cqw] text-white">
          <CocoMark mono="#fff" style={{ width: "13cqw", height: "9cqw" }} />
          <span className="font-bold leading-none tracking-tight" style={{ fontSize: "10cqw", fontFamily: "var(--serif)" }}>coco</span>
        </div>
        <div className="absolute inset-x-0 top-[19.5%] text-center font-bold uppercase text-white/80" style={{ fontSize: "4.2cqw", letterSpacing: ".32em" }}>verse</div>

        {/* the window: a corgi in front, a cat and a rabbit behind, a parrot above, a turtle at their feet */}
        <div className="absolute left-1/2 top-[26%] aspect-square w-[82%] -translate-x-1/2 rounded-full" style={{ background: s.window }}>
          {CROWD.map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={a.src} src={a.src} alt="" draggable={false} className="absolute max-w-none drop-shadow-[0_6px_8px_rgba(20,10,60,.3)]" style={a.style} />
          ))}
        </div>

        {/* the series */}
        <div className="absolute inset-x-[8%] bottom-[10%] text-center" style={{ color: s.ink }}>
          <div className="mx-auto mb-[3cqw] h-px w-[40%]" style={{ background: s.accent, opacity: 0.7 }} />
          <div className="font-black uppercase leading-none" style={{ fontSize: "8.6cqw", letterSpacing: ".06em", color: s.accent }}>{s.name}</div>
          {title && <div className="mt-[2.4cqw] font-bold leading-tight" style={{ fontSize: "7cqw", fontFamily: "var(--serif)" }}>{title}</div>}
          {sub && <div className="mt-[1.6cqw] leading-snug opacity-85" style={{ fontSize: "4.4cqw" }}>{sub}</div>}
        </div>

        {badge && (
          <div className="absolute right-[7%] top-[26%] rounded-full px-[2.6cqw] py-[1cqw] font-bold uppercase" style={{ fontSize: "3.8cqw", letterSpacing: ".1em", background: s.accent, color: "#1f1d33" }}>
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}
