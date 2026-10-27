"use client";

import { useEffect, useState } from "react";

export type Mood = "idle" | "happy" | "confused" | "thinking" | "close" | "busy" | "rest";

// How each mood loops through its frames: [frame index, milliseconds] pairs.
const TIMELINE: Record<Mood, [number, number][]> = {
  idle: [[0, 2800], [1, 140], [0, 1900], [1, 140]],
  happy: [[0, 260], [1, 260], [0, 260], [2, 420]],
  confused: [[0, 2200], [1, 150]],
  thinking: [[0, 1100], [1, 1100]],
  close: [[0, 1600], [1, 1800]],
  busy: [[0, 650], [1, 650]],
  rest: [[0, 2600], [1, 2600]],
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
    const next = () => {
      t = setTimeout(() => {
        i = (i + 1) % steps.length;
        setStep(i);
        next();
      }, steps[i][1]);
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
  return (
    <div
      className={`relative ${className} ${interactive ? "pointer-events-auto cursor-pointer" : ""}`}
      onClick={interactive ? () => setReacting((n) => n + 1) : undefined}
      title={interactive ? "Pat" : undefined}
    >
      <div className="char-shadow" data-mood={mood} />
      <div key={`${mood}-${reacting}`} className="char absolute inset-0" data-mood={mood}>
        {/* every frame stays loaded and stacked, so switching never flickers */}
        {frames.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f} src={f.startsWith("/") ? f : `/api/art/${f}?v=${encodeURIComponent(version)}`} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" style={{ opacity: i === show ? 1 : 0 }} />
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
