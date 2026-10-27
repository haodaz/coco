"use client";

import { useRef, useState } from "react";
import HoloCard from "@/components/HoloCard";
import NoteBox from "@/components/NoteBox";
import { PER_DAY } from "@/lib/daily";
import { finishFor } from "@/lib/finish";
import type { Card, Pet, State } from "@/lib/types";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

// Today's booster pack: pick up to 3 photos, the pack seals while the cards are painted,
// then the cards come out face down and turn over one at a time.
export default function DailyPack({ pet, state, onChange }: { pet: Pet; state: State; onChange: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "sealed" | "reveal">("idle");
  const [fresh, setFresh] = useState<Card[]>([]);
  const [shown, setShown] = useState(0);
  const [levelUp, setLevelUp] = useState<[number, number] | null>(null);

  const daily = state.cards.filter((c) => c.petId === pet.id && c.kind === "daily").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const today = new Date().toLocaleDateString("en-CA");
  const left = PER_DAY - daily.filter((c) => day(c.createdAt) === today).length;

  async function open(files: FileList) {
    const fd = new FormData();
    fd.append("petId", pet.id);
    [...files].slice(0, left).forEach((f) => fd.append("photos", f));
    setPhase("sealed");
    const r = await (await fetch("/api/daily", { method: "POST", body: fd })).json();
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
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-[22px] font-bold leading-tight">Today&apos;s pack</h2>
          <p className="text-[14px] text-[var(--sub)]">Up to {PER_DAY} photos a day, any moment, any day of {pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their"} life. Each style is a surprise.</p>
        </div>
        <div className="ml-auto text-right text-[13px] text-[var(--sub)]"><b className="text-[20px] text-[var(--ink)]">{Math.max(0, left)}</b> left today</div>
      </header>

      {phase === "idle" && (
        <button
          disabled={left <= 0}
          onClick={() => input.current?.click()}
          className="pack mt-4 grid h-44 w-full max-w-sm place-items-center rounded-2xl text-center text-white disabled:opacity-50"
        >
          <span>
            <span className="block text-[12px] font-semibold uppercase tracking-[.2em] opacity-80">{pet.name} · booster</span>
            <span className="mt-1 block text-[22px] font-bold">{left > 0 ? "Open with photos" : "Come back tomorrow"}</span>
          </span>
        </button>
      )}
      <input ref={input} type="file" multiple accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.length && open(e.target.files)} />

      {phase === "sealed" && (
        <div className="pack sealed mt-4 grid h-44 w-full max-w-sm place-items-center rounded-2xl text-center text-white">
          <span>
            <span className="block text-[12px] font-semibold uppercase tracking-[.2em] opacity-80">{pet.name} · booster</span>
            <span className="mt-1 block text-[18px] font-bold">Painting your cards…</span>
            <span className="mt-1 block text-[12px] opacity-80">about half a minute</span>
          </span>
        </div>
      )}

      {phase === "reveal" && (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {fresh.map((c, i) => (
              <button key={c.id} onClick={() => i === shown && setShown(shown + 1)} className={`flip block aspect-[63/88] w-full ${i < shown ? "flipped" : ""} ${i === shown ? "ring-4 ring-[var(--primary)]/30 rounded-2xl" : ""}`}>
                <div className="flip-inner">
                  <div className="flip-face"><div className="pack h-full w-full rounded-2xl" /></div>
                  <div className="flip-face front">
                    <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line={c.line} stars={c.rarity} label={`${pet.name} · ${c.style}`} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-[14px] text-[var(--sub)]">
            {shown < fresh.length ? "Tap the glowing card to turn it over." : levelUp ? <b className="text-[var(--ink)]">{pet.name}&apos;s picture just got sharper: clarity {levelUp[0]} → {levelUp[1]}.</b> : "All turned over."}
          </div>
          {shown >= fresh.length && <button onClick={done} className="mt-3 rounded-xl bg-[var(--primary)] px-4 py-2 text-[14px] font-semibold text-white">Add to collection</button>}
        </div>
      )}

      {daily.length > 0 && (
        <div className="mt-10">
          <h3 className="text-[16px] font-bold">Collection</h3>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {daily.map((c) => (
              <div key={c.id} id={`card-${c.id}`} className="scroll-mt-20">
                <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line={c.line} stars={c.rarity} label={`${pet.name} · ${c.style}`} />
                <div className="mt-1.5 px-1 text-[11.5px] leading-snug text-[var(--sub)]">{c.observation}</div>
                <NoteBox card={c} petName={pet.name} onSaved={onChange} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
