"use client";

import { useRef, useState } from "react";
import { appendPhoto } from "@/lib/prepare";
import { PACKS } from "@/lib/species";
import type { Credential, Pet, Species } from "@/lib/types";
import { call } from "@/lib/api";

// Step 1: one photo.
export function StartWithOnePhoto({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    await appendPhoto(fd, "photo", f);
    await call("/api/pets", { method: "POST", body: fd });
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
export function ConfirmProfile({ pet, onDone }: { pet: Pet; onDone: () => void }) {
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
