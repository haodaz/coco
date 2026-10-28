"use client";

import { useState } from "react";
import HoloCard from "@/components/HoloCard";
import { packFor } from "@/lib/species";
import type { Card, Pet, State } from "@/lib/types";
import { call } from "@/lib/api";
import { useT } from "@/lib/ui";

// The soul portrait: locked until the starter set is full, then one tap and the pet says who it is,
// on a legendary card it steps out of. Shows which cards that rests on.
export default function Legend({ pet, state, onChange, openCard }: { pet: Pet; state: State; onChange: () => Promise<void>; openCard?: (c: Card) => void }) {
  const [busy, setBusy] = useState(false);
  const { t } = useT();
  const slots = packFor(pet.species).quest;
  const done = slots.filter((s) => state.cards.some((c) => c.petId === pet.id && c.kind === "quest" && c.slotId === s.id)).length;
  const legend = state.cards.find((c) => c.petId === pet.id && c.kind === "legendary");
  const her = pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their";

  if (!legend)
    return (
      <section className="pack grid min-h-44 place-items-center rounded-3xl px-6 py-8 text-center text-white">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[.2em] opacity-80">{t("Legendary · soul portrait")}</div>
          <div className="mt-1 text-[24px] font-bold">{done < slots.length ? `${slots.length - done} more cards to unlock` : `${pet.name} is ready to tell you who ${pet.sex === "male" ? "he is" : pet.sex === "female" ? "she is" : "they are"}`}</div>
          <div className="mx-auto mt-1 max-w-md text-[13.5px] opacity-85">Finish the starter pack and {pet.name} reads back through all {her} cards, says who {pet.sex === "male" ? "he" : pet.sex === "female" ? "she" : "they"} {pet.sex ? "is" : "are"}, and gets a legendary card.</div>
          {done === slots.length && (
            <button
              disabled={busy}
              onClick={async () => { setBusy(true); await call(`/api/pets/${pet.id}/legend`, { method: "POST" }); await onChange(); setBusy(false); }}
              className="mt-5 rounded-xl bg-white px-5 py-2.5 text-[14.5px] font-semibold text-[#3b2a8f] shadow disabled:opacity-70"
            >
              {busy ? `${pet.name} is reading back through ${her} cards…` : t("Unlock the soul portrait")}
            </button>
          )}
        </div>
      </section>
    );

  const basis = (legend.basis ?? []).map((id) => state.cards.find((c) => c.id === id)).filter((c) => !!c);
  return (
    <section className="grid items-center gap-8 md:grid-cols-[minmax(240px,340px)_1fr]">
      <div className="mx-auto w-full max-w-[340px] cursor-pointer pt-10" onClick={() => openCard?.(legend)}>
        <HoloCard art={legend.art ?? ""} fg={legend.fg} plate={legend.plate} finish="popout" name={legend.name} line="" stars={3} label={`${pet.name} · Legend`} />
      </div>
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-[.16em] text-[var(--gold)]">{t("Legendary · soul portrait")}</div>
        <h2 className="serif mt-1 text-[30px] font-bold leading-tight">{legend.name}</h2>
        <p className="serif mt-3 text-[18px] italic leading-relaxed">“{legend.line}”</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {legend.observation.split(" · ").map((e) => <span key={e} className="rounded-full bg-[#efe9ff] px-3 py-1 text-[12.5px] font-medium text-[#5b3fb0]">{e}</span>)}
        </div>
        {basis.length > 0 && (
          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--ink3)]">{t("Drawn from {n} memories", { n: basis.length })}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {basis.map((c) => (
                <button key={c.id} onClick={() => openCard?.(c)} title={c.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.art ?? `/api/photos/${c.photoId}`} alt={c.name} className="h-14 w-10 rounded-md object-cover ring-1 ring-[var(--line)] transition hover:-translate-y-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
