"use client";

import { useEffect, useState } from "react";
import Character, { type Mood } from "@/components/Character";

// The hero's right side: the pet as a character, a few of its cards floating around it,
// and a small status line walking through what coco does, the pet's face following along.
const STEPS: { label: string; mood: Mood }[] = [
  { label: "Turning a photo into a Memory Print", mood: "busy" },
  { label: "Listening to what you told me", mood: "close" },
  { label: "Sharpening my picture of you", mood: "thinking" },
  { label: "Opening today's pack", mood: "happy" },
  { label: "Saying I don't know that yet", mood: "confused" },
  { label: "Telling you who I am", mood: "close" },
];

export default function HeroCompanion({ moods, cards }: { moods: Record<string, string[]>; cards: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STEPS.length), 3400);
    return () => clearInterval(t);
  }, []);
  const spots = [
    "left-[2%] top-[14%] -rotate-[10deg] [animation-delay:-1s]",
    "right-[0%] top-[6%] rotate-[8deg] [animation-delay:-2.4s]",
    "right-[4%] bottom-[22%] rotate-[12deg] [animation-delay:-3.6s]",
    "left-[6%] bottom-[18%] -rotate-[6deg] [animation-delay:-0.4s]",
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgba(22,119,255,.14),rgba(255,180,120,.10)_60%,transparent)]" />
      {cards.slice(0, 4).map((src, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" className={`float-card absolute w-[22%] rounded-xl shadow-[0_12px_30px_-10px_rgba(40,50,110,.45)] ring-4 ring-white ${spots[k]}`} />
      ))}
      <div className="absolute inset-x-[18%] bottom-[10%] top-[6%]">
        <Character moods={moods} mood={STEPS[i].mood} className="h-full w-full" />
      </div>
      <div className="absolute bottom-[2%] left-1/2 w-[64%] -translate-x-1/2 rounded-2xl bg-white/95 px-3.5 py-2 shadow-[0_8px_24px_-8px_rgba(40,50,110,.35)]">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-[#e8ebf3]">
            <div key={i} className="hero-progress h-full rounded-full bg-[var(--primary)]" />
          </div>
          <div className="truncate text-[12.5px] font-medium text-[#3d4460]">{STEPS[i].label}</div>
        </div>
      </div>
    </div>
  );
}
