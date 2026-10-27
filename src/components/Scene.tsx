"use client";

// Small compositions of cut-out 3D props (public/ws/assets, made by scripts/make-assets.mjs) that float gently,
// one per page. Pieces are placed in percentages of the scene box so it scales with the page.

type Piece = { src: string; style: React.CSSProperties; delay?: number; float?: boolean };

const A = (n: string) => `/ws/assets/${n}.png`;

const SCENES: Record<string, Piece[]> = {
  home: [
    { src: A("box"), style: { right: "4%", bottom: "4%", width: "46%" }, delay: -1.2 },
    { src: A("polaroids"), style: { left: "0%", top: "8%", width: "58%", rotate: "-8deg" }, delay: -3 },
  ],
  pack: [
    { src: A("box"), style: { right: "0%", bottom: "0%", width: "44%" }, delay: -2 },
    { src: A("pack"), style: { left: "4%", top: "2%", width: "62%", rotate: "-14deg" }, delay: -0.5 },
  ],
  cards: [
    { src: A("fan"), style: { left: "0%", top: "6%", width: "84%", rotate: "-6deg" }, delay: -1 },
    { src: A("cat"), style: { right: "2%", bottom: "0%", width: "34%" }, delay: -2.6 },
    { src: A("parrot"), style: { left: "6%", bottom: "0%", width: "26%" }, delay: -0.3 },
  ],
  memory: [
    { src: A("polaroids"), style: { right: "0%", bottom: "2%", width: "46%", rotate: "10deg" }, delay: -2 },
  ],
  signin: [
    { src: A("fan"), style: { left: "12%", top: "4%", width: "76%" }, delay: -1 },
    { src: A("cat"), style: { left: "2%", bottom: "2%", width: "28%" }, delay: -2.2 },
    { src: A("rabbit"), style: { left: "30%", bottom: "0%", width: "24%" }, delay: -0.6 },
    { src: A("turtle"), style: { right: "18%", bottom: "0%", width: "30%" }, delay: -3.1 },
    { src: A("parrot"), style: { right: "0%", bottom: "8%", width: "20%" }, delay: -1.7 },
  ],
};

export default function Scene({ name, portrait, className = "" }: { name: keyof typeof SCENES | string; portrait?: string; className?: string }) {
  const pieces = SCENES[name] ?? [];
  return (
    <div className={`relative aspect-[5/4] w-full ${className}`} aria-hidden>
      {/* a soft warm glow behind the props */}
      <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(closest-side,rgba(190,165,255,.45),rgba(190,165,255,0))]" />
      {name === "memory" && (
        <div className="float-card absolute left-[4%] top-[2%] w-[48%]" style={{ rotate: "-5deg" }}>
          {/* the pet's own pixel portrait sits inside the golden frame */}
          {portrait && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt="" className="absolute left-[17%] top-[15%] h-[70%] w-[66%] object-cover [image-rendering:pixelated]" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={A("frame")} alt="" className="relative w-full drop-shadow-[0_14px_20px_rgba(60,40,10,.25)]" />
        </div>
      )}
      {pieces.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.src + JSON.stringify(p.style)}
          src={p.src}
          alt=""
          className="float-card absolute drop-shadow-[0_14px_20px_rgba(60,40,10,.22)]"
          style={{ ...p.style, animationDelay: `${p.delay ?? 0}s` }}
        />
      ))}
    </div>
  );
}
