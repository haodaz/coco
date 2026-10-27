"use client";

import { useEffect, useState } from "react";
import Character, { type Mood } from "@/components/Character";
import { moveOf } from "@/lib/moves";
import type { Pet } from "@/lib/types";

// When the pet's memory grows enough to learn a new move, tell the owner once, with the move playing.
export default function UnlockToast({ pet }: { pet: Pet }) {
  const key = `coco-seen-moves-${pet.id}`;
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(key) ?? "");
    } catch {
      setSeen("");
    }
  }, [key]);
  if (seen === null || !pet.character) return null;
  const fresh = (pet.unlocks ?? []).filter((u) => u.at > seen && pet.character!.moods[u.mood]?.length);
  if (!fresh.length) return null;
  const close = () => {
    const latest = fresh.reduce((a, u) => (u.at > a ? u.at : a), seen);
    try {
      localStorage.setItem(key, latest);
    } catch {}
    setSeen(latest);
  };
  const her = pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(30,24,16,.45)] p-4 backdrop-blur-sm" onClick={close}>
      <div className="w-full max-w-md rounded-[26px] bg-[var(--paper)] p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">New move unlocked</div>
        <div className="mt-3 flex justify-center gap-4">
          {fresh.map((u) => (
            <div key={u.mood} className="w-36">
              <div className="relative mx-auto aspect-[3/4] w-full"><Character moods={pet.character!.moods} mood={u.mood as Mood} version={pet.character!.at} className="h-full w-full" /></div>
              <div className="serif mt-1 text-[19px] font-bold">{moveOf(u.mood)?.name ?? u.mood}</div>
              <div className="text-[12.5px] text-[var(--ink2)]">{moveOf(u.mood)?.when}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink2)]">
          {pet.name} remembers more of {her} life with you now. The more moments you share, the more {pet.name} can do.
        </p>
        <button onClick={close} className="mt-4 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-[14px] font-semibold text-white">Lovely</button>
      </div>
    </div>
  );
}
