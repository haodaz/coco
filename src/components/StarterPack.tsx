"use client";

import { useRef, useState } from "react";
import CardBack from "@/components/CardBack";
import HoloCard from "@/components/HoloCard";
import PackArt from "@/components/PackArt";
import { petArt } from "@/components/PetFace";
import { finishFor } from "@/lib/finish";
import { appendPhoto } from "@/lib/prepare";
import { packFor, type QuestSlot } from "@/lib/species";
import type { Card, Pet, State } from "@/lib/types";
import { call } from "@/lib/api";

// Step 2: the photo quest as a card set.
export default function StarterPack({ pet, state, onChange, openCard }: { pet: Pet; state: State; onChange: () => void; openCard: (c: Card) => void }) {
  const slots = packFor(pet.species).quest;
  const cards = state.cards.filter((c) => c.petId === pet.id && c.kind === "quest");
  const done = slots.filter((s) => cards.some((c) => c.slotId === s.id)).length;
  return (
    <section>
      <header className="flex flex-wrap items-center gap-4">
        <PackArt kind="starter" art={petArt(pet)} className="w-16 shrink-0 -rotate-6" />
        <div className="min-w-0 flex-1">
          <h2 className="serif text-[24px] font-bold leading-tight">Starter Kit</h2>
          <p className="text-[14px] text-[var(--ink2)]">Ten moments from photos you already have. Each one turns a card over; skip any you don&apos;t have yet. Finish it for {pet.name}&apos;s soul portrait and a first move card.</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[22px] font-bold">{done}<span className="text-[var(--sub)]">/{slots.length}</span></div>
          <div className="text-[12px] text-[var(--ink2)]">cards collected</div>
        </div>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${(done / slots.length) * 100}%` }} /></div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {slots.map((s, i) => <QuestCard key={s.id} slot={s} index={i} pet={pet} card={cards.find((c) => c.slotId === s.id)} onChange={onChange} openCard={openCard} />)}
      </div>
    </section>
  );
}

function QuestCard({ slot, index, pet, card, onChange, openCard }: { slot: QuestSlot; index: number; pet: Pet; card?: Card; onChange: () => void; openCard: (c: Card) => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    await appendPhoto(fd, "photo", f);
    fd.append("petId", pet.id);
    fd.append("slotId", slot.id);
    await call("/api/quest", { method: "POST", body: fd });
    setBusy(false);
    onChange();
  }
  return (
    <div id={card ? `card-${card.id}` : undefined} className="scroll-mt-6">
      <button onClick={() => (card ? openCard(card) : input.current?.click())} disabled={busy} className={`flip block aspect-[63/88] w-full ${card ? "flipped" : ""} ${busy ? "animate-pulse" : ""}`} title={card ? card.name : slot.why}>
        <div className="flip-inner">
          <div className="flip-face"><CardBack pattern={slot.pattern} title={slot.title} index={index} /></div>
          <div className="flip-face front">
            {card && <HoloCard art={card.art ?? `/api/photos/${card.photoId}`} fg={card.fg} finish={finishFor(card)} name={card.name} line={card.line} stars={card.rarity} label={`${pet.name} · No. ${String(index + 1).padStart(2, "0")}`} />}
          </div>
        </div>
      </button>
      <div className="mt-1.5 px-1 text-[11.5px] leading-snug text-[var(--ink2)]">{busy ? "Reading the photo and painting…" : card ? slot.title : slot.why}</div>
      <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}
