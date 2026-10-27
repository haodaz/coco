"use client";

import { useRef, useState } from "react";
import { appendPhoto } from "@/lib/prepare";
import { PACKS } from "@/lib/species";
import type { Credential, Pet, Species } from "@/lib/types";
import { call } from "@/lib/api";
import { useT } from "@/lib/ui";
import { CocoLogo } from "@/components/Brand";

// The way in: first what the owner gets, then a few easy questions, then one photo. Each step can be left.
// The answers wait in this browser (localStorage) until the photo has been read, then fill in the profile.
const ANSWERS = "coco-onboarding";
type Answers = { name: string; species: Species; born: string; sex: Pet["sex"] };
export const readAnswers = (): Partial<Answers> => {
  try {
    return JSON.parse(localStorage.getItem(ANSWERS) ?? "{}");
  } catch {
    return {};
  }
};

const KINDS: { v: Species; label: string; emoji: string }[] = [
  { v: "dog", label: "Dog", emoji: "🐕" },
  { v: "cat", label: "Cat", emoji: "🐈" },
  { v: "bird", label: "Bird", emoji: "🦜" },
  { v: "small_mammal", label: "Rabbit or small pet", emoji: "🐇" },
  { v: "reptile", label: "Reptile", emoji: "🐢" },
  { v: "fish", label: "Fish", emoji: "🐠" },
  { v: "other", label: "Something else", emoji: "🐾" },
];

function Leave() {
  const { t } = useT();
  return (
    <button
      onClick={async () => {
        try {
          const { browserClient } = await import("@/lib/supabase-browser");
          await browserClient().auth.signOut();
        } catch {}
        location.assign("/");
      }}
      className="text-[13px] font-medium text-[var(--ink2)] hover:text-[var(--ink)]"
    >
      {t("Leave for now")}
    </button>
  );
}

function Steps({ at }: { at: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === at ? "w-6 bg-[var(--gold)]" : i < at ? "w-1.5 bg-[var(--gold)]" : "w-1.5 bg-[#ddd8ef]"}`} />)}
    </div>
  );
}

export function OnboardingTop({ at }: { at: number }) {
  return (
    <div className="mx-auto flex max-w-xl items-center gap-4 pb-2">
      <CocoLogo size={20} />
      <Steps at={at} />
      <span className="ml-auto"><Leave /></span>
    </div>
  );
}

export function StartWithOnePhoto({ onDone }: { onDone: () => void }) {
  const saved = readAnswers();
  const { t, lang } = useT();
  const [step, setStep] = useState<0 | 1 | 2>(saved.name ? 2 : 0);
  const [a, setA] = useState<Answers>({ name: saved.name ?? "", species: saved.species ?? "dog", born: saved.born ?? "", sex: saved.sex ?? null });
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const name = a.name.trim() || t("your pet");
  const they = a.sex === "female" ? "her" : a.sex === "male" ? "him" : "them";

  function keep(next: Answers) {
    setA(next);
    try {
      localStorage.setItem(ANSWERS, JSON.stringify(next));
    } catch {}
  }
  async function upload(f: File) {
    setBusy(true);
    const fd = new FormData();
    await appendPhoto(fd, "photo", f);
    fd.append("lang", lang); // looks are described in the owner's language
    await call("/api/pets", { method: "POST", body: fd });
    setBusy(false);
    onDone();
  }
  const field = "mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--gold)]";
  const chip = (on: boolean) => `rounded-full border px-3.5 py-2 text-[14px] ${on ? "border-[var(--gold)] bg-[#efe9ff] font-semibold text-[#5b3fb0]" : "border-[var(--line)] bg-white text-[var(--ink2)]"}`;

  return (
    <section className="mx-auto max-w-xl">
      <OnboardingTop at={step} />

      {step === 0 && (
        <div className="mt-8">
          <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{t("Welcome")}</div>
          <h1 className="serif mt-2 text-[36px] font-bold leading-[1.08] tracking-tight">{t("Let's start your cocoverse.")}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink2)]">{t("A space for you and your pet, built only from moments that really happened. Here is what you get:")}</p>
          <div className="mt-5 grid gap-3">
            {[
              ["🃏", "Cards from your real moments", "Every photo becomes a collectible card that keeps the moment, the day and your words."],
              ["🐾", "Your pet, as an AI that grows", "It learns only from those cards, talks back in your pet's voice and says so when it hasn't seen something yet."],
              ["🗺️", "Help with real life", "It checks the weather and rules before a plan, and can meet a sitter or a new playmate first."],
            ].map(([icon, title, text]) => (
              <div key={title} className="ws-card flex gap-3.5 p-4">
                <span className="text-[26px] leading-none">{icon}</span>
                <span><b className="block text-[15px]">{t(title)}</b><span className="mt-0.5 block text-[13.5px] leading-snug text-[var(--ink2)]">{t(text)}</span></span>
              </div>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="mt-6 w-full rounded-xl bg-[var(--ink)] px-5 py-3.5 text-[15px] font-semibold text-white">{t("Start · about two minutes")}</button>
          <p className="mt-3 text-center text-[12px] text-[var(--ink3)]">{t("Your photos stay in your account. People's faces are blurred on your device first.")}</p>
        </div>
      )}

      {step === 1 && (
        <div className="mt-8">
          <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{t("A few questions")}</div>
          <h1 className="serif mt-2 text-[32px] font-bold leading-[1.1] tracking-tight">{t("Who are we getting to know?")}</h1>
          <label className="mt-5 block text-[13px] text-[var(--ink2)]">{t("Their name")}<input autoFocus className={field} value={a.name} onChange={(e) => keep({ ...a, name: e.target.value })} placeholder={t("Coco, Mochi, Captain…")} /></label>
          <div className="mt-4 text-[13px] text-[var(--ink2)]">{t("What kind of animal")}</div>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {KINDS.map((k) => <button key={k.v} onClick={() => keep({ ...a, species: k.v })} className={chip(a.species === k.v)}>{k.emoji} {t(k.label)}</button>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-[13px] text-[var(--ink2)]">{t("Birthday")} <span className="text-[var(--ink3)]">{t("(if you know)")}</span><input type="date" className={field} value={a.born} onChange={(e) => keep({ ...a, born: e.target.value })} /></label>
            <div className="text-[13px] text-[var(--ink2)]">
              {t("Girl or boy")}
              <div className="mt-1 flex gap-2">
                <button onClick={() => keep({ ...a, sex: a.sex === "female" ? null : "female" })} className={chip(a.sex === "female")}>{t("Girl")}</button>
                <button onClick={() => keep({ ...a, sex: a.sex === "male" ? null : "male" })} className={chip(a.sex === "male")}>{t("Boy")}</button>
              </div>
            </div>
          </div>
          <div className="mt-7 flex items-center gap-3">
            <button onClick={() => setStep(0)} className="rounded-xl px-4 py-3 text-[14px] font-medium text-[var(--ink2)]">{t("Back")}</button>
            <button disabled={!a.name.trim()} onClick={() => setStep(2)} className="flex-1 rounded-xl bg-[var(--ink)] px-5 py-3.5 text-[15px] font-semibold text-white disabled:opacity-40">{t("Next")}</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{t("One photo")}</div>
          <h1 className="serif mt-2 text-[32px] font-bold leading-[1.1] tracking-tight">{t("Show us {name}", { name })}</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--ink2)]">
            {t("One clear photo where we can see {name} well. We'll read the looks (coat, marks, breed) and you can correct anything. Later, more photos make {name} more alive.", { name })}
          </p>
          <button disabled={busy} onClick={() => input.current?.click()} className="mt-6 w-full rounded-2xl border-2 border-dashed border-[#c9cede] bg-white px-6 py-14 text-[15px] font-medium text-[var(--gold)] transition hover:border-[var(--gold)] disabled:opacity-60">
            {busy ? t("Looking at {name}…", { name }) : t("Choose a photo")}
          </button>
          <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          {!busy && <button onClick={() => setStep(1)} className="mt-4 text-[14px] font-medium text-[var(--ink2)]">{t("Back")}</button>}
        </div>
      )}
    </section>
  );
}

// Step 1b: the pre-filled profile; the owner corrects and names the pet.
export function ConfirmProfile({ pet, onDone }: { pet: Pet; onDone: () => void }) {
  const told = readAnswers(); // what the owner already said: it wins over what the photo suggests
  const [name, setName] = useState(told.name ?? "");
  const [species, setSpecies] = useState<Species>(told.species ?? pet.species);
  const [breed, setBreed] = useState(pet.breed ?? "");
  const [born, setBorn] = useState(told.born ?? "");
  const [sex, setSex] = useState<Pet["sex"]>(told.sex ?? null);
  const [credential, setCredential] = useState<Credential>("unknown");
  async function save() {
    await fetch(`/api/pets/${pet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), species, breed: breed || null, born: born || null, sex, credential }) });
    try {
      localStorage.removeItem(ANSWERS);
    } catch {}
    onDone();
  }
  const field = "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--gold)]";
  return (
    <>
    <OnboardingTop at={3} />
    <section className="mx-auto mt-6 grid max-w-3xl gap-8 md:grid-cols-[260px_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${pet.avatarPhotoId}`} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover shadow-[0_10px_30px_rgba(40,50,110,.12)]" />
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">Almost there</div>
        <h2 className="serif mt-1 text-[28px] font-bold">Here&apos;s who we see</h2>
        <p className="mt-1 text-[14px] text-[var(--ink2)]">Appearance only. Fix anything we got wrong.</p>
        <div className="mt-4 rounded-xl bg-white p-4 text-[13.5px] leading-relaxed shadow-sm">
          <div><b>Looks like:</b> {pet.breedCandidates.map((b) => `${b.name} (${Math.round(b.confidence * 100)}%)`).join(" · ")}</div>
          <div><b>Coat:</b> {pet.appearance.coat ?? "—"}</div>
          <div><b>Marks:</b> {pet.appearance.marks ?? "—"}</div>
          <div><b>Size:</b> {pet.appearance.size ?? "—"}</div>
        </div>
        <div className="mt-5 grid gap-3">
          <label className="text-[13px] text-[var(--ink2)]">Name<input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your pet&apos;s name" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[13px] text-[var(--ink2)]">Species
              <select className={field} value={species} onChange={(e) => setSpecies(e.target.value as Species)}>{Object.values(PACKS).map((p) => <option key={p.species} value={p.species}>{p.label}</option>)}</select>
            </label>
            <label className="text-[13px] text-[var(--ink2)]">Breed<input className={field} value={breed} onChange={(e) => setBreed(e.target.value)} list="breeds" /></label>
            <datalist id="breeds">{pet.breedCandidates.map((b) => <option key={b.name} value={b.name} />)}</datalist>
            <label className="text-[13px] text-[var(--ink2)]">Birthday<input className={field} type="date" value={born} onChange={(e) => setBorn(e.target.value)} /></label>
            <label className="text-[13px] text-[var(--ink2)]">Sex
              <select className={field} value={sex ?? ""} onChange={(e) => setSex((e.target.value || null) as Pet["sex"])}><option value="">—</option><option value="female">Female</option><option value="male">Male</option></select>
            </label>
          </div>
          <label className="text-[13px] text-[var(--ink2)]">Working status (changes travel and housing plans)
            <select className={field} value={credential} onChange={(e) => setCredential(e.target.value as Credential)}>
              <option value="unknown">Prefer not to say</option><option value="none">Pet</option><option value="service">Service animal</option><option value="esa">Emotional support animal</option><option value="therapy">Therapy animal</option>
            </select>
          </label>
          <button disabled={!name.trim()} onClick={save} className="mt-2 rounded-xl bg-[var(--ink)] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-40">This is {name.trim() || "them"} →</button>
        </div>
      </div>
    </section>
    </>
  );
}
