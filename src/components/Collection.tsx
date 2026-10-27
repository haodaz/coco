"use client";

import HoloCard from "@/components/HoloCard";
import { finishFor } from "@/lib/finish";
import type { Card, Pet } from "@/lib/types";

// Cards from daily packs, newest first. Each opens in the card view.
export default function Collection({ pet, cards, openCard }: { pet: Pet; cards: Card[]; openCard: (c: Card) => void }) {
  if (!cards.length) return <p className="text-[14px] text-[var(--ink2)]">Cards from your daily packs will gather here.</p>;
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <button key={c.id} onClick={() => openCard(c)} className="text-left">
          <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line={c.line} stars={c.rarity} label={`${pet.name} · ${c.style}`} />
          <div className="mt-1.5 px-1 text-[11.5px] text-[var(--ink3)]">{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {c.style}</div>
        </button>
      ))}
    </div>
  );
}
