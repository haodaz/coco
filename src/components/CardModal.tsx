"use client";

import { CalendarDays, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import HoloCard from "@/components/HoloCard";
import NoteBox from "@/components/NoteBox";
import { finishFor } from "@/lib/finish";
import { SENSES } from "@/lib/memory";
import { packFor } from "@/lib/species";
import { tIn, useT } from "@/lib/ui";
import type { Card, Pet, State } from "@/lib/types";

const RARITY = ["", "Common", "Rare", "Legend"];

// One card, opened: the card itself to turn in your hands, and the Memory Print it holds —
// the day, what the photo shows, what you said, what the AI took from it — with a way to add your words or talk about it.
export function CardDetail({ card, state, pet, onClose, onChanged, compact = false }: { card: Card; state: State; pet: Pet; onClose?: () => void; onChanged: () => void; compact?: boolean }) {
  const { t: tr } = useT();
  const live = state.cards.find((c) => c.id === card.id) ?? card; // pick up a new note after saving
  const photo = state.photos.find((p) => p.id === live.photoId);
  const traces = state.traces.filter((t) => (t.source.type === "photo" && t.source.photoId === live.photoId) || (t.source.type === "note" && t.source.noteId === live.id));
  const slot = packFor(pet.species).quest.find((s) => s.id === live.slotId);
  const kind = tIn(tr, slot?.title ?? (live.pattern ? SENSES[live.pattern] : live.kind === "legendary" ? "Soul portrait" : "Moment"), "kind of moment");
  const when = photo?.takenAt ? new Date(photo.takenAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
  const basis = (live.basis ?? []).map((id) => state.cards.find((c) => c.id === id)).filter((c) => !!c);

  return (
      <div className={`grid gap-8 ${compact ? "" : "md:grid-cols-[minmax(0,340px)_1fr]"}`}>
        <div className={`mx-auto w-full ${compact ? "max-w-[260px]" : "max-w-[340px]"} ${live.kind === "legendary" ? "pt-10" : ""}`}>
          <HoloCard art={live.art ?? `/api/photos/${live.photoId}`} fg={live.fg} finish={finishFor(live)} name={live.name} line={live.line} stars={live.rarity} label={`${pet.name} · ${live.style}`} idle={false} />
          <div className="mt-3 text-center text-[12px] text-[var(--ink3)]"><span className="hidden md:inline">{tr("Move over the card to turn it in the light")}</span><span className="md:hidden">{tr("Drag across the card to turn it in the light")}</span></div>
        </div>
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{tr(RARITY[live.rarity])} · {kind}</div>
              <h2 className="serif mt-1 text-[28px] font-bold leading-tight">{live.name}</h2>
            </div>
            {onClose && <button onClick={onClose} className="ml-auto rounded-full p-2 hover:bg-[rgba(35,32,27,.06)]" aria-label={tr("Close")}><X size={18} /></button>}
          </div>
          <p className="serif mt-3 text-[18px] italic leading-relaxed">“{live.line}”</p>

          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ink3)]">{tr("The memory it keeps")}</div>
            {when && <div className="mt-2 flex items-center gap-1.5 text-[13.5px] text-[var(--ink2)]"><CalendarDays size={14} /> {when}</div>}
            <div className="mt-3 text-[13.5px] leading-relaxed text-[var(--ink2)]">{live.observation}</div>
            {traces.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {traces.map((t) => (
                  <span key={t.id} className={`rounded-full px-2.5 py-1 text-[12px] ${t.source.type === "note" ? "bg-[#efe9ff] text-[#5b3fb0]" : "bg-[#eeebf8] text-[var(--ink2)]"}`} title={t.detail ?? undefined}>
                    {t.label}{t.source.type === "note" ? tr(" · your words") : ""}
                  </span>
                ))}
              </div>
            )}
            {live.kind !== "legendary" && (
              <div className="mt-3 border-t border-[var(--line)] pt-2">
                <NoteBox card={live} petName={pet.name} onSaved={onChanged} />
              </div>
            )}
            {basis.length > 0 && (
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <div className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ink3)]">{tr("Drawn from {n} memories", { n: basis.length })}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {basis.map((c) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={c.id} src={c.art ?? `/api/photos/${c.photoId}`} alt={c.name} title={c.name} className="h-14 w-10 rounded-md object-cover ring-1 ring-[var(--line)]" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href={`/app/chat?q=${encodeURIComponent(`Tell me about “${live.name}”.`)}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-[14px] font-semibold text-white">
            <MessageCircle size={16} /> {tr("Talk with {name} about this moment", { name: pet.name })}
          </Link>
        </div>
      </div>
  );
}

export default function CardModal({ card, state, pet, onClose, onChanged }: { card: Card; state: State; pet: Pet; onClose: () => void; onChanged: () => void }) {
  const { t } = useT();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(30,24,16,.55)] backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-8 min-h-[calc(100%-32px)] max-w-4xl rounded-t-[28px] bg-[var(--paper)] p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl md:my-12 md:min-h-0 md:rounded-[28px] md:p-8" onClick={(e) => e.stopPropagation()}>
        {/* phones: a close button that stays in reach while the card scrolls */}
        <div className="sticky top-2 z-10 -mb-9 flex justify-end md:hidden">
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[var(--ink)] shadow-[0_4px_14px_rgba(31,29,51,.18)]" aria-label={t("Close")}><X size={18} /></button>
        </div>
        <CardDetail card={card} state={state} pet={pet} onClose={onClose} onChanged={onChanged} />
      </div>
    </div>
  );
}
