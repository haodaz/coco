"use client";

import { ArrowLeft, Copy, X } from "lucide-react";
import { useRef, useState } from "react";
import CardBack from "@/components/CardBack";
import { CardDetail } from "@/components/CardModal";
import DailyPack from "@/components/DailyPack";
import HoloCard from "@/components/HoloCard";
import { spotCoco } from "@/components/Companion";
import LinkMaker from "@/components/LinkMaker";
import type { Memory } from "@/components/MemoryPanel";
import { call } from "@/lib/api";
import { finishFor } from "@/lib/finish";
import { SENSES } from "@/lib/memory";
import { appendPhoto } from "@/lib/prepare";
import { packFor, type Pattern } from "@/lib/species";
import type { Card, Pet, PetAction, Share, State } from "@/lib/types";
import type { Fact } from "@/lib/rules";
import Link from "next/link";
import { AreaPicker, FactCard } from "@/components/PlaceView";

const TITLE: Record<PetAction["type"], string> = {
  show_cards: "Memories",
  open_card: "A memory",
  open_pack: "Today's pack",
  add_photo: "Teach me something new",
  show_memory: "How well I know myself",
  make_link: "Introduce me",
  show_place: "What I checked",
};

// The conversation's side panel: whatever the pet opened while answering, ready to look at or act on.
export default function ActionPanel({ action, facts = [], pet, state, memory, admin, onClose, refresh }: { action: PetAction; facts?: Fact[]; pet: Pet; state: State; memory?: Memory; admin: boolean; onClose: () => void; refresh: () => void }) {
  const [card, setCard] = useState<Card | null>(null);
  const slots = packFor(pet.species).quest;
  const patternOf = (c: Card) => c.pattern ?? slots.find((s) => s.id === c.slotId)?.pattern ?? null;
  const mine = state.cards.filter((c) => c.petId === pet.id);

  let body: React.ReactNode = null;
  if (card) body = <CardDetail card={card} state={state} pet={pet} onChanged={refresh} compact />;
  else if (action.type === "open_card") {
    const c = mine.find((x) => x.id === action.cardIds[0]);
    body = c ? <CardDetail card={c} state={state} pet={pet} onChanged={refresh} compact /> : null;
  } else if (action.type === "show_cards") {
    const picked = action.cardIds.length ? mine.filter((c) => action.cardIds.includes(c.id)) : mine.filter((c) => !action.topic || patternOf(c) === action.topic);
    body = (
      <>
        {action.topic && <div className="mb-3 text-[13px] text-[var(--ink2)]">{SENSES[action.topic as Pattern]} · {picked.length} card{picked.length === 1 ? "" : "s"}</div>}
        <div className="grid grid-cols-2 gap-3">
          {picked.map((c) => (
            <button key={c.id} data-coco-spot={`card-${c.id}`} data-coco-x="0.55" onMouseEnter={() => spotCoco(`card-${c.id}`)} onMouseLeave={() => spotCoco(null)} onClick={() => { setCard(c); spotCoco(null); }} className="text-left">
              <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line="" stars={c.rarity} label={pet.name} idle={false} />
            </button>
          ))}
        </div>
        {!picked.length && <p className="text-[14px] text-[var(--ink2)]">No cards about this yet.</p>}
      </>
    );
  } else if (action.type === "open_pack") body = <DailyPack pet={pet} state={state} onChange={async () => refresh()} admin={admin} />;
  else if (action.type === "add_photo") {
    const slot = slots.find((s) => s.id === action.slotId);
    body = slot ? <SlotUpload pet={pet} slotId={slot.id} title={slot.title} why={slot.why} pattern={slot.pattern} onDone={refresh} /> : <DailyPack pet={pet} state={state} onChange={async () => refresh()} admin={admin} />;
  } else if (action.type === "show_memory" && memory) {
    body = (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/likeness/${pet.id}?p=${memory.points}`} alt="" className="mx-auto aspect-[3/4] w-48 rounded-xl object-cover [image-rendering:pixelated]" />
        <div className="serif mt-3 text-center text-[20px] font-bold">{memory.name}</div>
        <div className="mt-1 text-center text-[13px] text-[var(--ink2)]">Clarity {memory.level}/{memory.maxLevel} · {memory.next ? `${memory.next - memory.points} more to sharpen` : "fully clear"}</div>
        <div className="mx-auto mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${memory.next ? Math.round(((memory.points - memory.floor) / (memory.next - memory.floor)) * 100) : 100}%` }} /></div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {memory.senses.map((s) => <span key={s.pattern} className={`rounded-full px-2.5 py-1 text-[12px] ${s.imprints ? "bg-[#efe9ff] text-[#5b3fb0]" : "bg-[#eeebf8] text-[var(--ink3)]"}`}>{s.label}{s.imprints ? ` · ${s.imprints}` : ""}</span>)}
        </div>
      </div>
    );
  } else if (action.type === "show_place") {
    body = state.place ? (
      <div className="grid gap-3">
        {facts.length ? facts.map((f) => <FactCard key={f.id} fact={f} />) : <p className="text-[14px] text-[var(--ink2)]">I didn&apos;t need to check anything about {state.place.name} for that.</p>}
        <Link href="/app/place" className="text-[13px] font-semibold text-[var(--gold)]">Everything around us in {state.place.name} →</Link>
      </div>
    ) : (
      <div>
        <p className="mb-3 text-[14px] text-[var(--ink2)]">Tell me where we live and I&apos;ll check the weather and the rules there before I speak up about a plan.</p>
        <AreaPicker onPicked={refresh} />
      </div>
    );
  } else if (action.type === "make_link") body = <LinkPanel kind={action.kind ?? "sitter"} pet={pet} onMade={refresh} />;

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--paper)] shadow-[0_20px_50px_-24px_rgba(35,32,27,.35)]">
      <header data-coco-spot="panel" data-coco-x="0.72" className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3">
        {card && <button onClick={() => setCard(null)} className="rounded-full p-1.5 hover:bg-[rgba(35,32,27,.06)]" aria-label="Back"><ArrowLeft size={16} /></button>}
        <div className="text-[11px] font-bold uppercase tracking-[.18em] text-[var(--gold)]">{pet.name} opened</div>
        <div className="serif text-[16px] font-bold">{card ? card.name : TITLE[action.type]}</div>
        <button onClick={onClose} className="ml-auto rounded-full p-1.5 hover:bg-[rgba(35,32,27,.06)]" aria-label="Close"><X size={16} /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{body}</div>
    </aside>
  );
}

// One empty starter slot: the photo the pet asked for, turned into a card right here.
function SlotUpload({ pet, slotId, title, why, pattern, onDone }: { pet: Pet; slotId: string; title: string; why: string; pattern: Pattern; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    await appendPhoto(fd, "photo", f);
    fd.append("petId", pet.id);
    fd.append("slotId", slotId);
    const r = await call("/api/quest", { method: "POST", body: fd });
    setBusy(false);
    if (r) {
      setDone(true);
      onDone();
    }
  }
  return (
    <div className="text-center">
      <button onClick={() => input.current?.click()} disabled={busy} className={`mx-auto block aspect-[63/88] w-48 ${busy ? "animate-pulse" : ""}`}>
        <CardBack pattern={pattern} title={title} index={0} />
      </button>
      <div className="serif mt-3 text-[18px] font-bold">{title}</div>
      <p className="mt-1 text-[13px] text-[var(--ink2)]">{done ? "Done. Ask me again." : busy ? "Reading the photo and painting…" : `A photo you already have teaches me ${why}.`}</p>
      {!done && <button disabled={busy} onClick={() => input.current?.click()} className="mt-3 rounded-xl bg-[var(--ink)] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50">Choose a photo</button>}
      <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

function LinkPanel({ kind, pet, onMade }: { kind: Share["kind"]; pet: Pet; onMade: () => void }) {
  const [made, setMade] = useState<Share | null>(null);
  const url = made ? `${location.origin}/${made.kind === "sitter" ? "s" : "p"}/${made.token}` : "";
  if (made)
    return (
      <div className="ws-card p-4">
        <div className="serif text-[18px] font-bold">Here&apos;s the link</div>
        <div className="mt-2 break-all rounded-lg bg-[var(--paper)] px-3 py-2 text-[13px]">{url}</div>
        <button onClick={() => navigator.clipboard.writeText(url)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-4 py-2 text-[14px] font-semibold text-white"><Copy size={14} /> Copy</button>
        <p className="mt-2 text-[12px] text-[var(--ink3)]">You can switch it off any time under Friends.</p>
      </div>
    );
  return (
    <LinkMaker
      kind={kind}
      pet={pet}
      title={kind === "sitter" ? "For a sitter" : "Find a playmate"}
      blurb={kind === "sitter" ? `Whoever looks after ${pet.name} can talk with ${pet.name}'s twin. Food, medicine and house rules always go back to you.` : `Another pet's owner opens this with their pet; the two twins talk first.`}
      onMade={(s) => { setMade(s); onMade(); }}
    />
  );
}
