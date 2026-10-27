"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Character, { type Mood } from "@/components/Character";
import MoveCard from "@/components/MoveCard";
import { waitingMoves, type MoveCard as Owned } from "@/lib/moves";
import type { Pet, State } from "@/lib/types";
import { useT } from "@/lib/ui";

// When the pet learns a move, say so once, softly: its move card isn't handed over, it drops out of a pack.
export default function UnlockToast({ pet, state }: { pet: Pet; state: State }) {
  const key = `coco-told-moves-${pet.id}`;
  const [told, setTold] = useState<string[] | null>(null);
  const { t } = useT();
  useEffect(() => {
    try {
      setTold(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {
      setTold([]);
    }
  }, [key]);
  if (told === null || !pet.character) return null;
  const fresh = waitingMoves(pet, state).filter((m) => !told.includes(m.mood) && pet.character!.moods[m.mood]?.length);
  if (!fresh.length) return null;
  const close = () => {
    const all = [...new Set([...told, ...fresh.map((m) => m.mood)])];
    try {
      localStorage.setItem(key, JSON.stringify(all));
    } catch {}
    setTold(all);
  };
  const m = fresh[0];
  return (
    <div className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[55] mx-auto max-w-md md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3 pr-2 shadow-[0_18px_40px_-16px_rgba(40,30,90,.45)]">
        <div className="relative h-16 w-12 shrink-0"><Character moods={pet.character.moods} mood={m.mood as Mood} version={pet.character.at} className="h-full w-full" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.18em] text-[var(--gold)]">{t("{name} learned a move", { name: pet.name })}</div>
          <div className="text-[14px] leading-snug">
            <b>{t(m.name)}</b>{fresh.length > 1 ? t(" and {n} more", { n: fresh.length - 1 }) : ""}{t(". ")}{t("The move card drops from one of your next packs.")}
          </div>
          <Link href="/app/pack" onClick={close} className="mt-1 inline-block text-[13px] font-semibold text-[var(--gold)]">{t("Open a pack")} →</Link>
        </div>
        <button onClick={close} className="self-start rounded-full p-1.5 text-[var(--ink3)] hover:bg-[rgba(35,32,27,.06)]" aria-label="Close"><X size={15} /></button>
      </div>
    </div>
  );
}

// The card that finishes the Starter Kit brings the first move card out with it.
export function BonusMove({ pet, mood, onClose }: { pet: Pet; mood: string; onClose: () => void }) {
  const { t } = useT();
  const owned: Owned = { mood, at: "", from: "starter" };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(20,16,40,.55)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[26px] bg-[var(--paper)] p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{t("Starter Kit complete · Bonus")}</div>
        <div className="serif mt-1 text-[22px] font-bold">{t("A move card fell out")}</div>
        <div className="card-rise mx-auto mt-4 w-[200px]"><MoveCard pet={pet} mood={mood} owned={owned} /></div>
        <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink2)]">{t("Every move {name} learns from now on drops out of a pack like this one.", { name: pet.name })}</p>
        <button onClick={onClose} className="mt-4 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-[14px] font-semibold text-white">{t("Add to my collection")}</button>
      </div>
    </div>
  );
}
