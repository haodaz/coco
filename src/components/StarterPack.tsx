"use client";

import { useRef, useState } from "react";
import CardBack from "@/components/CardBack";
import HoloCard from "@/components/HoloCard";
import NoteBox from "@/components/NoteBox";
import { finishFor } from "@/lib/finish";
import { packFor, type QuestSlot } from "@/lib/species";
import type { Card, Pet, State } from "@/lib/types";

// Step 2: the photo quest as a card set.
export default function StarterPack({ pet, state, onChange }: { pet: Pet; state: State; onChange: () => void }) {
  const slots = packFor(pet.species).quest;
  const cards = state.cards.filter((c) => c.petId === pet.id && c.kind === "quest");
  const done = slots.filter((s) => cards.some((c) => c.slotId === s.id)).length;
  return (
    <section>
      <header className="flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-[22px] font-bold leading-tight">Starter pack</h2>
          <p className="text-[14px] text-[var(--sub)]">Ten moments from photos you already have. Each one turns a card over. Skip any you don&apos;t have yet.</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[22px] font-bold">{done}<span className="text-[var(--sub)]">/{slots.length}</span></div>
          <div className="text-[12px] text-[var(--sub)]">cards collected</div>
        </div>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${(done / slots.length) * 100}%` }} /></div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {slots.map((s, i) => <QuestCard key={s.id} slot={s} index={i} pet={pet} card={cards.find((c) => c.slotId === s.id)} onChange={onChange} />)}
      </div>
    </section>
  );
}

function QuestCard({ slot, index, pet, card, onChange }: { slot: QuestSlot; index: number; pet: Pet; card?: Card; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("photo", f);
    fd.append("petId", pet.id);
    fd.append("slotId", slot.id);
    await fetch("/api/quest", { method: "POST", body: fd });
    setBusy(false);
    onChange();
  }
  return (
    <div id={card ? `card-${card.id}` : undefined} className="scroll-mt-6">
      <button onClick={() => input.current?.click()} disabled={busy} className={`flip block aspect-[63/88] w-full ${card ? "flipped" : ""} ${busy ? "animate-pulse" : ""}`} title={card ? "Replace photo" : slot.why}>
        <div className="flip-inner">
          <div className="flip-face"><CardBack pattern={slot.pattern} title={slot.title} index={index} /></div>
          <div className="flip-face front">
            {card && <HoloCard art={card.art ?? `/api/photos/${card.photoId}`} fg={card.fg} finish={finishFor(card)} name={card.name} line={card.line} stars={card.rarity} label={`${pet.name} · No. ${String(index + 1).padStart(2, "0")}`} />}
          </div>
        </div>
      </button>
      <div className="mt-1.5 px-1 text-[11.5px] leading-snug text-[var(--sub)]">{busy ? "Reading the photo and painting…" : card ? card.observation : slot.why}</div>
      {card && !busy && <NoteBox card={card} petName={pet.name} onSaved={onChange} />}
      <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}
