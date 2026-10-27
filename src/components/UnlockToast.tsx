"use client";

import { useEffect, useState } from "react";
import MoveCard from "@/components/MoveCard";
import PackArt from "@/components/PackArt";
import { petArt } from "@/components/PetFace";
import { moveCards } from "@/lib/moves";
import type { Pet, State } from "@/lib/types";

// When the pet learns a move (the Starter Kit's first, or one taught later), a Special pack arrives:
// tap to tear it open, and the move card comes out playing. Each move card is shown once (remembered in this browser).
export default function UnlockToast({ pet, state }: { pet: Pet; state: State }) {
  const key = `coco-move-cards-${pet.id}`;
  const [seen, setSeen] = useState<string[] | null>(null);
  const [step, setStep] = useState<"pack" | "tear" | "cards">("pack");
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setSeen([]);
    }
  }, [key]);
  if (seen === null || !pet.character) return null;
  const owned = moveCards(pet, state);
  const fresh = owned.filter((m) => !seen.includes(m.mood) && pet.character!.moods[m.mood]?.length);
  if (!fresh.length) return null;
  const close = () => {
    const all = [...new Set([...seen, ...fresh.map((m) => m.mood)])];
    try {
      localStorage.setItem(key, JSON.stringify(all));
    } catch {}
    setSeen(all);
    setStep("pack");
  };
  const open = () => {
    setStep("tear");
    setTimeout(() => setStep("cards"), 650);
  };
  const her = pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their";
  const why = fresh.some((m) => m.from === "starter") ? `You finished the Starter Kit.` : `${pet.name} remembers more of ${her} life with you now.`;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[rgba(20,16,40,.55)] p-4 backdrop-blur-sm">
      <div className={`w-full text-center ${fresh.length > 2 ? "max-w-xl" : "max-w-md"}`}>
        {step !== "cards" ? (
          <>
            <div className="text-[11px] font-bold uppercase tracking-[.22em] text-[#f5d27a]">A Special pack arrived</div>
            <div className="serif mt-1 text-[24px] font-bold text-white">{why}</div>
            <button onClick={open} className={`mx-auto mt-5 block w-[min(230px,60vw)] ${step === "tear" ? "pack-tear" : "transition hover:-translate-y-1"}`}>
              <PackArt kind="special" art={petArt(pet)} title={`${fresh.length} move card${fresh.length > 1 ? "s" : ""}`} sub="Tap to open" badge="Special" />
            </button>
            <button onClick={close} className="mt-4 text-[13px] text-white/70">Later</button>
          </>
        ) : (
          <div className="rounded-[26px] bg-[var(--paper)] p-5 shadow-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">New move card{fresh.length > 1 ? "s" : ""}</div>
            <div className={`mx-auto mt-4 grid gap-3 ${fresh.length > 2 ? "grid-cols-3" : fresh.length > 1 ? "grid-cols-2" : "max-w-[200px]"}`}>
              {fresh.map((m, i) => (
                <div key={m.mood} className="card-rise" style={{ animationDelay: `${i * 120}ms` }}>
                  <MoveCard pet={pet} mood={m.mood} owned={m} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink2)]">
              {pet.name} can do this now, and you&apos;ll see it when you talk. The more you teach {pet.name}, the more moves {pet.name} learns.
            </p>
            <button onClick={close} className="mt-4 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-[14px] font-semibold text-white">Add to my collection</button>
          </div>
        )}
      </div>
    </div>
  );
}
