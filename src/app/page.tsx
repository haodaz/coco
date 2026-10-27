"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CardBack from "@/components/CardBack";
import HoloCard from "@/components/HoloCard";
import AskPanel from "@/components/AskPanel";
import MemoryPanel, { type Memory } from "@/components/MemoryPanel";
import NoteBox from "@/components/NoteBox";
import { finishFor } from "@/lib/finish";
import { PACKS, packFor, type QuestSlot } from "@/lib/species";
import type { Card, Credential, Pet, Species, State } from "@/lib/types";

type Loaded = State & { live: boolean; memory: Record<string, Memory> };

export default function Home() {
  const [state, setState] = useState<Loaded | null>(null);
  const refresh = useCallback(async () => setState(await (await fetch("/api/state")).json()), []);
  useEffect(() => { refresh(); }, [refresh]);

  if (!state) return <main className="p-10 text-[var(--sub)]">Loading…</main>;
  const pet = state.pets[0];
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      {!state.live && <div className="mb-4 rounded-lg bg-[#fff7e6] px-3 py-2 text-[12px] text-[#ad6800]">Practice mode: the AI answers are samples. No request goes to the Meta API until live mode is on.</div>}
      {!pet ? <StartWithOnePhoto onDone={refresh} /> : !pet.name ? <ConfirmProfile pet={pet} onDone={refresh} /> : <Quest pet={pet} state={state} onChange={refresh} />}
    </main>
  );
}

// Step 1: one photo.
function StartWithOnePhoto({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("photo", f);
    await fetch("/api/pets", { method: "POST", body: fd });
    setBusy(false);
    onDone();
  }
  return (
    <section className="mx-auto mt-16 max-w-md text-center">
      <h1 className="text-[34px] font-bold tracking-tight">Start with one photo</h1>
      <p className="mt-3 text-[15px] text-[var(--sub)]">Any photo of your pet. We&apos;ll figure out who they are, and you correct us.</p>
      <button disabled={busy} onClick={() => input.current?.click()} className="mt-8 w-full rounded-2xl border-2 border-dashed border-[#c9cede] bg-white px-6 py-14 text-[15px] font-medium text-[var(--primary)] transition hover:border-[var(--primary)] disabled:opacity-60">
        {busy ? "Looking at your photo…" : "Choose a photo"}
      </button>
      <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </section>
  );
}

// Step 1b: the pre-filled profile; the owner corrects and names the pet.
function ConfirmProfile({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>(pet.species);
  const [breed, setBreed] = useState(pet.breed ?? "");
  const [born, setBorn] = useState("");
  const [sex, setSex] = useState<Pet["sex"]>(null);
  const [credential, setCredential] = useState<Credential>("unknown");
  async function save() {
    await fetch(`/api/pets/${pet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), species, breed: breed || null, born: born || null, sex, credential }) });
    onDone();
  }
  const field = "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--primary)]";
  return (
    <section className="mx-auto mt-8 grid max-w-3xl gap-8 md:grid-cols-[260px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${pet.avatarPhotoId}`} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-[0_10px_30px_rgba(40,50,110,.12)]" />
      <div>
        <h2 className="text-[24px] font-bold">Here&apos;s who we see</h2>
        <p className="mt-1 text-[14px] text-[var(--sub)]">Appearance only. Fix anything we got wrong.</p>
        <div className="mt-4 rounded-xl bg-white p-4 text-[13.5px] leading-relaxed shadow-sm">
          <div><b>Looks like:</b> {pet.breedCandidates.map((b) => `${b.name} (${Math.round(b.confidence * 100)}%)`).join(" · ")}</div>
          <div><b>Coat:</b> {pet.appearance.coat ?? "—"}</div>
          <div><b>Marks:</b> {pet.appearance.marks ?? "—"}</div>
          <div><b>Size:</b> {pet.appearance.size ?? "—"}</div>
        </div>
        <div className="mt-5 grid gap-3">
          <label className="text-[13px] text-[var(--sub)]">Name<input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Coco" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[13px] text-[var(--sub)]">Species
              <select className={field} value={species} onChange={(e) => setSpecies(e.target.value as Species)}>{Object.values(PACKS).map((p) => <option key={p.species} value={p.species}>{p.label}</option>)}</select>
            </label>
            <label className="text-[13px] text-[var(--sub)]">Breed<input className={field} value={breed} onChange={(e) => setBreed(e.target.value)} list="breeds" /></label>
            <datalist id="breeds">{pet.breedCandidates.map((b) => <option key={b.name} value={b.name} />)}</datalist>
            <label className="text-[13px] text-[var(--sub)]">Birthday<input className={field} type="date" value={born} onChange={(e) => setBorn(e.target.value)} /></label>
            <label className="text-[13px] text-[var(--sub)]">Sex
              <select className={field} value={sex ?? ""} onChange={(e) => setSex((e.target.value || null) as Pet["sex"])}><option value="">—</option><option value="female">Female</option><option value="male">Male</option></select>
            </label>
          </div>
          <label className="text-[13px] text-[var(--sub)]">Working status (changes travel and housing plans)
            <select className={field} value={credential} onChange={(e) => setCredential(e.target.value as Credential)}>
              <option value="unknown">Prefer not to say</option><option value="none">Pet</option><option value="service">Service animal</option><option value="esa">Emotional support animal</option><option value="therapy">Therapy animal</option>
            </select>
          </label>
          <button disabled={!name.trim()} onClick={save} className="mt-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-40">This is {name.trim() || "them"} →</button>
        </div>
      </div>
    </section>
  );
}

// Step 2: the photo quest as a card set.
function Quest({ pet, state, onChange }: { pet: Pet; state: Loaded; onChange: () => void }) {
  const slots = packFor(pet.species).quest;
  const cards = state.cards.filter((c) => c.petId === pet.id && c.kind === "quest");
  const done = slots.filter((s) => cards.some((c) => c.slotId === s.id)).length;
  return (
    <section>
      <header className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/photos/${pet.avatarPhotoId}`} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-white" />
        <div>
          <h1 className="text-[26px] font-bold leading-tight">{pet.name}&apos;s first set</h1>
          <p className="text-[14px] text-[var(--sub)]">Pick photos you already have. Each one turns a card over. Skip any you don&apos;t have yet.</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[22px] font-bold">{done}<span className="text-[var(--sub)]">/{slots.length}</span></div>
          <div className="text-[12px] text-[var(--sub)]">cards collected</div>
        </div>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${(done / slots.length) * 100}%` }} /></div>
      {state.memory?.[pet.id] && <div className="mt-6"><MemoryPanel pet={pet} memory={state.memory[pet.id]} /></div>}
      <div className="mt-4"><AskPanel pet={pet} /></div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {slots.map((s, i) => <QuestCard key={s.id} slot={s} index={i} pet={pet} card={cards.find((c) => c.slotId === s.id)} onChange={onChange} />)}
      </div>
      {done === slots.length && <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm"><div className="text-[18px] font-bold">Set complete</div><div className="mt-1 text-[14px] text-[var(--sub)]">{pet.name}&apos;s first soul portrait is ready to unlock.</div></div>}
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
