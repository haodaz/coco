"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { moodCoco, spotCoco } from "@/components/Companion";
import HoloCard from "@/components/HoloCard";
import { PER_DAY } from "@/lib/daily";
import { finishFor } from "@/lib/finish";
import { appendPhoto } from "@/lib/prepare";
import type { Card, Pet, State } from "@/lib/types";
import { call } from "@/lib/api";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

// Today's booster pack: tap it and it says what's inside (up to 3 memories), fill its slots with photos from any day,
// then open it. The pack seals while the cards are painted, and the cards come out face down to turn over one at a time.
export default function DailyPack({ pet, state, onChange, admin = false }: { pet: Pet; state: State; onChange: () => Promise<void>; admin?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "pick" | "sealed" | "reveal">("idle");
  const [chosen, setChosen] = useState<{ file: File; url: string }[]>([]);
  const [fresh, setFresh] = useState<Card[]>([]);
  const [shown, setShown] = useState(0);
  const [levelUp, setLevelUp] = useState<[number, number] | null>(null);
  // the companion comes to sit beside the pack: busy while it is painted, happy when the cards turn over
  useEffect(() => {
    spotCoco("pack");
    moodCoco(phase === "sealed" ? "busy" : phase === "reveal" ? "happy" : null);
  }, [phase]);
  useEffect(() => () => { spotCoco(null); moodCoco(null); }, []);

  const daily = state.cards.filter((c) => c.petId === pet.id && c.kind === "daily").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const today = new Date().toLocaleDateString("en-CA");
  const left = admin ? PER_DAY : PER_DAY - daily.filter((c) => day(c.createdAt) === today).length;

  function add(files: FileList) {
    const room = left - chosen.length;
    setChosen((c) => [...c, ...[...files].slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }
  function remove(i: number) {
    setChosen((c) => {
      URL.revokeObjectURL(c[i].url);
      return c.filter((_, k) => k !== i);
    });
  }
  async function open(files: File[]) {
    const fd = new FormData();
    fd.append("petId", pet.id);
    setPhase("sealed");
    for (const f of files.slice(0, left)) await appendPhoto(fd, "photos", f);
    const r = (await call<{ cards: Card[]; levelBefore: number; levelAfter: number }>("/api/daily", { method: "POST", body: fd })) ?? { cards: null as unknown as Card[], levelBefore: 0, levelAfter: 0 };
    if (!r.cards) return setPhase("pick");
    chosen.forEach((c) => URL.revokeObjectURL(c.url));
    setChosen([]);
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

      <div data-coco-spot={phase === "reveal" ? undefined : "pack"} data-coco-side="right" className="mx-auto w-[min(270px,72vw)]">
      {phase === "idle" && (
        <button
          disabled={left <= 0}
          onClick={() => setPhase("pick")}
          className="pack pack-tall flex aspect-[5/7] w-full flex-col items-center justify-between px-5 pb-8 pt-10 text-center text-white transition hover:-translate-y-1 hover:rotate-[-1deg] disabled:opacity-50"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[.24em] opacity-80">{pet.name} · booster</span>
          <span>
            <span className="serif block text-[64px] font-bold leading-none">{left > 0 ? left : "✓"}</span>
            <span className="serif mt-2 block text-[22px] font-bold leading-tight">{left > 0 ? `Memory Print${left > 1 ? "s" : ""} waiting` : "Come back tomorrow"}</span>
          </span>
          <span className="text-[12.5px] leading-snug opacity-85">{left > 0 ? "Tap to open" : "A new pack arrives at midnight"}</span>
        </button>
      )}
      <input ref={input} type="file" multiple accept="image/*,.heic,.heif" hidden onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.target.value = ""; }} />

      {phase === "sealed" && (
        <div className="pack pack-tall sealed flex aspect-[5/7] w-full flex-col items-center justify-between px-5 pb-8 pt-10 text-center text-white">
          <span className="text-[11px] font-semibold uppercase tracking-[.24em] opacity-80">{pet.name} · booster</span>
          <span className="serif block text-[26px] font-bold leading-tight">Painting your cards…</span>
          <span className="text-[12px] opacity-80">about half a minute</span>
        </div>
      )}

      </div>

      {phase === "pick" && (
        <div className="mx-auto -mt-2 max-w-md text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">Today&apos;s pack</div>
          <div className="serif mt-1 text-[26px] font-bold leading-tight">{left} memor{left > 1 ? "ies" : "y"} of {pet.name} to keep today</div>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink2)]">
            Pick {left > 1 ? `up to ${left} photos` : "a photo"} from any day of your life together: a walk, a nap, a silly face. Each one becomes a card in a style you won&apos;t know until it turns over, and one more memory {pet.name}&apos;s AI keeps.
          </p>
          <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: `repeat(${left}, minmax(0, 1fr))` }}>
            {Array.from({ length: left }, (_, i) => {
              const c = chosen[i];
              return c ? (
                <div key={c.url} className="relative aspect-[5/7] overflow-hidden rounded-2xl bg-[#ece9f6] shadow-[0_10px_24px_-12px_rgba(40,30,90,.4)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-white/85 px-2 py-1 text-[11px] text-[var(--ink2)]">{c.file.name}</span>
                  <button onClick={() => remove(i)} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[var(--ink)] shadow" aria-label="Remove"><X size={14} /></button>
                </div>
              ) : (
                <button key={`empty-${i}`} onClick={() => input.current?.click()} className="grid aspect-[5/7] place-items-center rounded-2xl border-2 border-dashed border-[#cfc7ee] bg-white/70 text-[var(--gold)] transition hover:border-[var(--gold)]">
                  <span className="flex flex-col items-center gap-1.5 text-[12.5px] font-semibold"><ImagePlus size={22} strokeWidth={1.7} />Memory {i + 1}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-[var(--ink3)]">People&apos;s faces are blurred on your device before anything is uploaded.</p>
          <button disabled={!chosen.length} onClick={() => open(chosen.map((c) => c.file))} className="pack mt-4 w-full rounded-2xl px-5 py-3.5 text-[15.5px] font-semibold text-white disabled:opacity-40">
            {chosen.length ? `Open the pack with ${chosen.length} memor${chosen.length > 1 ? "ies" : "y"}` : "Add a photo to open the pack"}
          </button>
          <button onClick={() => setPhase("idle")} className="mt-3 text-[13px] font-medium text-[var(--ink2)]">Not now</button>
        </div>
      )}

      {phase === "reveal" && (
        <div className="mt-5 text-center">
          <div data-coco-spot="pack" data-coco-side="right" className="mx-auto grid max-w-3xl grid-cols-2 gap-5 text-left sm:grid-cols-3">
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
