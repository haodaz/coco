"use client";

import { useEffect, useRef, useState } from "react";

export type Mood = "idle" | "happy" | "confused" | "thinking" | "close" | "busy" | "rest" | "walk";

// How each mood loops through its frames: [frame index, milliseconds] pairs.
const TIMELINE: Record<Mood, [number, number][]> = {
  idle: [[0, 3600], [1, 160], [0, 2600], [1, 160]],
  happy: [[0, 900], [2, 700]], // mouth a little more open; the wiggle itself is CSS, so nothing jumps side to side
  confused: [[0, 2200], [1, 150]],
  thinking: [[0, 1100], [1, 1100]],
  close: [[0, 1600], [1, 1800]],
  busy: [[0, 650], [1, 650]],
  rest: [[0, 2600], [1, 2600]],
  // a four-legged walk: up to eight frames, one full stride (an older six-frame walk just uses the frames it has)
  walk: [[0, 140], [1, 140], [2, 140], [3, 140], [4, 140], [5, 140], [6, 140], [7, 140]],
};

// The pet as a living character: cut out with no background, the mood's frames loop like a GIF,
// and the whole body moves with the mood (a hop when happy, a tilt when puzzled, leaning in when close).
// A move the pet hasn't unlocked yet falls back to just being there. With `interactive`, a tap makes it react.
export default function Character({ moods, mood: asked, version = "", className = "", interactive = false }: { moods: Record<string, string[]>; mood: Mood; version?: string; className?: string; interactive?: boolean }) {
  const [reacting, setReacting] = useState(0);
  const want: Mood = reacting && moods.happy?.length ? "happy" : asked;
  const mood: Mood = moods[want]?.length ? want : "idle";
  const frames = moods[mood] ?? [];
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    const steps = TIMELINE[mood].filter(([f]) => f < frames.length);
    if (steps.length < 2) return;
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    // held frames vary a little each time (a blink comes when it comes), so the loop never feels metronomic
    const hold = (ms: number) => (ms > 600 ? ms * (0.6 + Math.random() * 0.9) : ms);
    const next = () => {
      t = setTimeout(() => {
        i = (i + 1) % steps.length;
        setStep(i);
        next();
      }, hold(steps[i][1]));
    };
    next();
    return () => clearTimeout(t);
  }, [mood, frames.length]);
  useEffect(() => {
    if (!reacting) return;
    const t = setTimeout(() => setReacting(0), 1700);
    return () => clearTimeout(t);
  }, [reacting]);
  const steps = TIMELINE[mood].filter(([f]) => f < frames.length);
  const show = steps[step]?.[0] ?? 0;
  const visible = frames[show];
  const base = frames[0];
  const quick = (steps[step]?.[1] ?? 1000) < 300; // a blink: swap at once, no fade
  const [prev, setPrev] = useState<string | null>(null);
  const last = useRef(visible);
  useEffect(() => {
    if (last.current === visible) return;
    setPrev(last.current);
    last.current = visible;
    const t = setTimeout(() => setPrev(null), 260);
    return () => clearTimeout(t);
  }, [visible]);
  // every frame of every mood stays mounted and loaded; switching only changes opacity, and something opaque is
  // always underneath (the mood's first frame, and the frame just left), so the body never turns see-through
  const all = [...new Set(Object.values(moods).flat())];
  // walking frames differ in the legs, so nothing may show through underneath them: one frame at a time, swapped at once
  const alone = mood === "walk";
  // a tap on the same mood restarts its movement without remounting anything
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = body.current;
    if (!el || !reacting) return;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }, [reacting]);
  return (
    <div
      className={`relative ${className} ${interactive ? "pointer-events-auto cursor-pointer" : ""}`}
      onClick={interactive ? () => setReacting((n) => n + 1) : undefined}
      title={interactive ? "Pat" : undefined}
    >
      <div className="char-shadow" data-mood={mood} />
      <div ref={body} className="char absolute inset-0" data-mood={mood}>
        {all.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f} src={f.startsWith("/") ? f : `/api/art/${f}?v=${encodeURIComponent(version)}`} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full object-contain"
            style={{
              opacity: f === visible || (!alone && (f === prev || f === base)) ? 1 : 0,
              zIndex: f === visible ? 3 : f === prev ? 2 : f === base ? 1 : 0,
              transition: f === visible && !quick ? "opacity 200ms ease-out" : "none",
            }}
          />
        ))}
      </div>
      {reacting > 0 && (
        <span key={reacting} className="pat-heart pointer-events-none absolute left-1/2 top-[8%] text-[22px] text-[#e2557b]" aria-hidden>
          ♥
        </span>
      )}
    </div>
  );
}
