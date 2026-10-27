"use client";

import { useRef, useState } from "react";
import HoloCard from "@/components/HoloCard";
import { PER_DAY } from "@/lib/daily";
import { finishFor } from "@/lib/finish";
import { appendPhoto } from "@/lib/prepare";
import type { Card, Pet, State } from "@/lib/types";
import { call } from "@/lib/api";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

// Today's booster pack: pick up to 3 photos, the pack seals while the cards are painted,
// then the cards come out face down and turn over one at a time.
export default function DailyPack({ pet, state, onChange, admin = false }: { pet: Pet; state: State; onChange: () => Promise<void>; admin?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "sealed" | "reveal">("idle");
  const [fresh, setFresh] = useState<Card[]>([]);
  const [shown, setShown] = useState(0);
  const [levelUp, setLevelUp] = useState<[number, number] | null>(null);

  const daily = state.cards.filter((c) => c.petId === pet.id && c.kind === "daily").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const today = new Date().toLocaleDateString("en-CA");
  const left = admin ? PER_DAY : PER_DAY - daily.filter((c) => day(c.createdAt) === today).length;

  async function open(files: FileList) {
    const fd = new FormData();
    fd.append("petId", pet.id);
    setPhase("sealed");
    for (const f of [...files].slice(0, left)) await appendPhoto(fd, "photos", f);
    const r = (await call<{ cards: Card[]; levelBefore: number; levelAfter: number }>("/api/daily", { method: "POST", body: fd })) ?? { cards: null as unknown as Card[], levelBefore: 0, levelAfter: 0 };
    if (!r.cards) return setPhase("idle");
    setFresh(r.cards);
    setShown(0);
    setLevelUp(r.levelAfter > r.levelBefore ? [r.levelBefore, r.levelAfter] : null);
    setPhase("reveal");
  }
  async function done() {
    await onChange();
    setPhase("idle");
    setFresh([]);
  }

  return (
    <section>

      {phase === "idle" && (
        <button
          disabled={left <= 0}
          onClick={() => input.current?.click()}
          className="pack mx-auto grid h-72 w-full max-w-md place-items-center rounded-[26px] text-center text-white transition hover:scale-[1.02] disabled:opacity-50"
        >
          <span>
            <span className="block text-[12px] font-semibold uppercase tracking-[.2em] opacity-80">{pet.name} · booster</span>
            <span className="serif mt-2 block text-[30px] font-bold">{left > 0 ? `${left} Memory Print${left > 1 ? "s" : ""} waiting` : "Come back tomorrow"}</span>
            <span className="mt-2 block text-[13px] opacity-85">{left > 0 ? "Tap to choose photos from any day of your life together" : "A new pack arrives at midnight"}</span>
          </span>
        </button>
      )}
      <input ref={input} type="file" multiple accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.length && open(e.target.files)} />

      {phase === "sealed" && (
        <div className="pack sealed mx-auto grid h-72 w-full max-w-md place-items-center rounded-[26px] text-center text-white">
          <span>
            <span className="block text-[12px] font-semibold uppercase tracking-[.2em] opacity-80">{pet.name} · booster</span>
            <span className="serif mt-2 block text-[26px] font-bold">Painting your cards…</span>
            <span className="mt-1 block text-[12px] opacity-80">about half a minute</span>
          </span>
        </div>
      )}

      {phase === "reveal" && (
        <div className="mt-5 text-center">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-5 text-left sm:grid-cols-3">
            {fresh.map((c, i) => (
              <button key={c.id} onClick={() => i === shown && setShown(shown + 1)} className={`flip block aspect-[63/88] w-full ${i < shown ? "flipped" : ""} ${i === shown ? "ring-4 ring-[var(--gold)]/50 rounded-2xl animate-pulse" : ""}`}>
                <div className="flip-inner">
                  <div className="flip-face"><div className="pack h-full w-full rounded-2xl" /></div>
                  <div className="flip-face front">
                    <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line={c.line} stars={c.rarity} label={`${pet.name} · ${c.style}`} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-center text-[14px] text-[var(--ink2)]">
            {shown < fresh.length ? "Tap the glowing card to turn it over." : levelUp ? <b className="text-[var(--ink)]">{pet.name}&apos;s picture just got sharper: clarity {levelUp[0]} → {levelUp[1]}.</b> : "All turned over."}
          </div>
          {shown >= fresh.length && <button onClick={done} className="mt-3 rounded-xl bg-[var(--ink)] px-4 py-2 text-[14px] font-semibold text-white">Add to my collection</button>}
        </div>
      )}

    </section>
  );
}
