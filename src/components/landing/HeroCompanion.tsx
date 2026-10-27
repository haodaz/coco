"use client";

import { useEffect, useState, type ReactNode } from "react";
import Character, { type Mood } from "@/components/Character";
import PackArt from "@/components/PackArt";

// The hero's right side: the pet as a character, and around it a small scene that changes with each thing coco does,
// so the banner shows the whole product, not one pose. The pictures are the demo pet's real cards and portraits;
// the little speech bubbles are illustrations and never claim a memory.

type Assets = { cards: string[]; levels: string[]; legend: string | null; said: string };

const P = (n: string) => `/ws/assets/${n}.png`;

function Prop({ children, className, delay = 0 }: { children: ReactNode; className: string; delay?: number }) {
  return (
    <div className={`hero-prop absolute ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="float-card" style={{ animationDelay: `${-delay * 3}ms` }}>{children}</div>
    </div>
  );
}

const card = (src: string, cls = "w-24") => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`${cls} aspect-[3/4] rounded-xl object-cover shadow-[0_14px_28px_-10px_rgba(40,30,90,.45)] ring-4 ring-white`} />
);
// eslint-disable-next-line @next/next/no-img-element
const prop = (n: string, cls: string) => <img src={P(n)} alt="" className={`${cls} drop-shadow-[0_14px_20px_rgba(40,30,90,.25)]`} />;
const bubble = (text: string, cls = "") => <div className={`max-w-[190px] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-left text-[12px] leading-snug text-[#3d4460] shadow-[0_10px_24px_-10px_rgba(40,30,90,.35)] ${cls}`}>{text}</div>;

export default function HeroCompanion({ moods, assets }: { moods: Record<string, string[]>; assets: Assets }) {
  const [i, setI] = useState(0);
  const [level, setLevel] = useState(0);
  const c = assets.cards;
  const STEPS: { label: string; mood: Mood; scene: ReactNode }[] = [
    {
      label: "Turning a photo into a Memory Print",
      mood: "busy",
      scene: (
        <>
          <Prop className="left-[0%] top-[8%] -rotate-[8deg]">{prop("polaroids", "w-44")}</Prop>
          <Prop className="right-[2%] top-[14%] rotate-[7deg]" delay={350}>{card(c[0] ?? "", "w-32")}</Prop>
        </>
      ),
    },
    {
      label: "Listening to what you told me",
      mood: "close",
      scene: (
        <>
          <Prop className="right-[0%] top-[10%]">{bubble(`“${assets.said}”`)}</Prop>
          <Prop className="left-[2%] top-[22%] -rotate-[6deg]" delay={250}>{card(c[4] ?? c[0] ?? "", "w-28")}</Prop>
        </>
      ),
    },
    {
      label: "Sharpening my picture of you",
      mood: "thinking",
      scene: (
        <Prop className="right-[0%] top-[6%] rotate-[5deg]">
          <div className="relative w-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assets.levels[level % assets.levels.length]} alt="" className="absolute left-[17%] top-[15%] h-[70%] w-[66%] object-cover [image-rendering:pixelated]" />
            {prop("frame", "relative w-full")}
          </div>
        </Prop>
      ),
    },
    {
      label: "Opening today's pack",
      mood: "happy",
      scene: (
        <>
          <Prop className="left-[2%] top-[4%] -rotate-[12deg]"><PackArt kind="booster" art={moods.idle?.[0]} className="w-28" /></Prop>
          <Prop className="right-[0%] top-[18%]" delay={200}>{prop("box", "w-32")}</Prop>
          <Prop className="right-[14%] top-[0%] rotate-[10deg]" delay={500}>{card(c[7] ?? c[0] ?? "", "w-24")}</Prop>
        </>
      ),
    },
    {
      label: "Saying I haven't seen that yet",
      mood: "confused",
      scene: (
        <>
          <Prop className="right-[4%] top-[12%] rotate-[6deg]">
            <div className="grid aspect-[3/4] w-24 place-items-center rounded-xl bg-[linear-gradient(135deg,#2b3a8f,#5b3fb0_50%,#c2418f)] text-[40px] font-bold text-white/90 shadow-[0_14px_28px_-10px_rgba(40,30,90,.45)] ring-4 ring-white">?</div>
          </Prop>
          <Prop className="left-[0%] top-[16%]" delay={300}>{bubble("A photo of me in the car would teach me.")}</Prop>
        </>
      ),
    },
    {
      label: "Keeping a sitter company while you're away",
      mood: "close",
      scene: (
        <>
          <Prop className="right-[0%] top-[10%]">
            <div className="w-44 rounded-2xl bg-white p-3 text-left shadow-[0_14px_28px_-10px_rgba(40,30,90,.4)]">
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#6d4fd1]">For a sitter</div>
              <div className="mt-1 text-[12.5px] font-semibold text-[#1f1d33]">Sam · Nov 10–14</div>
              <div className="mt-1 text-[11px] text-[#5c5a75]">Sleep · Walks · Trips · Others</div>
            </div>
          </Prop>
          <Prop className="left-[0%] top-[26%]" delay={300}>{bubble("Where do you like to sleep?")}</Prop>
        </>
      ),
    },
    {
      label: "Meeting a new friend first",
      mood: "happy",
      scene: (
        <>
          <Prop className="right-[-2%] bottom-[12%]">{prop("cat", "w-36")}</Prop>
          <Prop className="right-[6%] top-[6%]" delay={300}>{bubble("Hi, I'm new here. How do you like to play?")}</Prop>
          <Prop className="left-[0%] top-[20%]" delay={700}>{bubble("Let's see if we get on.")}</Prop>
        </>
      ),
    },
    {
      label: "Telling you who I am",
      mood: "close",
      scene: assets.legend ? <Prop className="right-[0%] top-[4%] rotate-[6deg]">{card(assets.legend, "w-40")}</Prop> : null,
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STEPS.length), 3800);
    return () => clearInterval(t);
  }, [STEPS.length]);
  // the portrait sharpens while that step is showing
  useEffect(() => {
    if (i !== 2) return;
    setLevel(0);
    const t = setInterval(() => setLevel((l) => l + 1), 850);
    return () => clearInterval(t);
  }, [i]);

  const step = STEPS[i];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[480px]">
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgba(109,79,209,.16),rgba(194,65,143,.08)_60%,transparent)]" />
      <div key={i} className="absolute inset-0">{step.scene}</div>
      <div className="absolute inset-x-[20%] bottom-[10%] top-[8%]">
        <Character moods={moods} mood={step.mood} className="h-full w-full" interactive />
      </div>
      <div className="absolute bottom-[2%] left-1/2 w-[72%] -translate-x-1/2 rounded-2xl bg-white/95 px-3.5 py-2 shadow-[0_8px_24px_-8px_rgba(40,30,90,.35)]">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-[#ebe7f6]">
            <div key={i} className="hero-progress h-full rounded-full bg-[var(--primary)]" />
          </div>
          <div className="truncate text-[12.5px] font-medium text-[#3d4460]">{step.label}</div>
        </div>
      </div>
    </div>
  );
}
