"use client";

import { useEffect, useState } from "react";
import Character, { type Mood } from "@/components/Character";

// The character running through its moods, with what each one is for.
const SHOW: { mood: Mood; say: string }[] = [
  { mood: "idle", say: "Waiting for you." },
  { mood: "busy", say: "Looking through our moments…" },
  { mood: "thinking", say: "Hmm, let me remember." },
  { mood: "happy", say: "I know this one." },
  { mood: "close", say: "This one is about us." },
  { mood: "confused", say: "You haven't shown me that yet." },
];

export default function MoodShow({ moods }: { moods: Record<string, string[]> }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SHOW.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[300px]">
        <Character moods={moods} mood={SHOW[i].mood} className="h-full w-full" />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {SHOW.map((s, k) => (
          <button key={s.mood} onClick={() => setI(k)} className={`rounded-full px-3 py-1 text-[12.5px] transition ${k === i ? "bg-[var(--ink)] text-white" : "bg-white text-[var(--sub)] shadow-sm"}`}>
            {s.mood}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[14px] text-[var(--sub)]">“{SHOW[i].say}”</p>
    </div>
  );
}
