"use client";

import { Check } from "lucide-react";
import { seriesProgress } from "@/lib/series";
import type { Card, Pet, State } from "@/lib/types";

// The themed series, each a row of slots: a card fills a slot when its moment fits (one card can fill slots in
// several series). Empty slots say what would fill them, so the owner knows what to look for.
export default function SeriesView({ pet, state, openCard }: { pet: Pet; state: State; openCard: (c: Card) => void }) {
  const all = seriesProgress(state, pet);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {all.map((s) => {
        const done = s.filled === s.slots.length;
        return (
          <section key={s.id} className="ws-card p-4">
            <header className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.colour }} />
              <div className="min-w-0 flex-1">
                <div className="serif text-[18px] font-bold leading-tight">{s.name}</div>
                <div className="text-[13px] text-[var(--ink2)]">{s.blurb}</div>
              </div>
              {done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4d6] px-2.5 py-1 text-[11.5px] font-bold text-[#8a5a00]"><Check size={12} /> Complete</span>
              ) : (
                <span className="text-[13px] font-semibold text-[var(--ink2)]">{s.filled}/{s.slots.length}</span>
              )}
            </header>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full transition-all" style={{ width: `${(s.filled / s.slots.length) * 100}%`, background: s.colour }} /></div>
            <div className="mt-3 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${s.slots.length}, minmax(0, 1fr))` }}>
              {s.slots.map((slot) =>
                slot.card ? (
                  <button key={slot.tag} onClick={() => openCard(slot.card!)} className="text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.card.art ?? `/api/photos/${slot.card.photoId}`} alt={slot.card.name} className="aspect-[3/4] w-full rounded-lg object-cover shadow-sm ring-2" style={{ ["--tw-ring-color" as string]: `${s.colour}55` }} />
                    <div className="mt-1 truncate text-[11.5px] font-semibold">{slot.label}</div>
                  </button>
                ) : (
                  <div key={slot.tag}>
                    <div className="grid aspect-[3/4] w-full place-items-center rounded-lg border-2 border-dashed border-[#d8d2ee] bg-white/60 px-1 text-center text-[10.5px] leading-tight text-[var(--ink3)]">{slot.hint}</div>
                    <div className="mt-1 truncate text-[11.5px] text-[var(--ink3)]">{slot.label}</div>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
