"use client";

import { Check, ImagePlus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { moodCoco, spotCoco } from "@/components/Companion";
import HoloCard from "@/components/HoloCard";
import MoveCard from "@/components/MoveCard";
import PackArt from "@/components/PackArt";
import { petArt } from "@/components/PetFace";
import { call } from "@/lib/api";
import { finishFor } from "@/lib/finish";
import Link from "next/link";
import { moveOf, starterDoneAt } from "@/lib/moves";
import { packFor } from "@/lib/species";
import { balance, FREE_PER_DAY, PACK_COST, sealedPrints, sharesToday, TASK_POINTS, tasksFor, type Task } from "@/lib/points";
import { appendPhoto } from "@/lib/prepare";
import type { Card, Pet, State } from "@/lib/types";
import { useT } from "@/lib/ui";

type Result = { url: string; text: string; earned: number };

// Today: teach the pet and earn Memory Points (today's tasks ask for what it knows least; three free shares a day),
// then spend points to open a Daily Booster, which paints shared memories into cards and may drop a move card.
export default function DailyPack({ pet, state, onChange, admin = false }: { pet: Pet; state: State; onChange: () => Promise<void>; admin?: boolean }) {
  const [phase, setPhase] = useState<"idle" | "sealed" | "reveal">("idle");
  const [fresh, setFresh] = useState<Card[]>([]);
  const [bonus, setBonus] = useState<string | null>(null);
  const [shown, setShown] = useState(0);
  const [levelUp, setLevelUp] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // the task id being answered, or "free"
  const [results, setResults] = useState<Result[]>([]);
  const [words, setWords] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const forTask = useRef<Task | null>(null);
  const { t } = useT();
  useEffect(() => {
    spotCoco("pack");
    moodCoco(phase === "sealed" || busy ? "busy" : phase === "reveal" ? "happy" : null);
  }, [phase, busy]);
  useEffect(() => () => { spotCoco(null); moodCoco(null); }, []);

  const points = balance(state, pet.id);
  const waiting = sealedPrints(state, pet.id).length;
  const freeLeft = admin ? FREE_PER_DAY : Math.max(0, FREE_PER_DAY - sharesToday(state, pet.id));
  const tasks = tasksFor(state, pet);
  const canOpen = waiting > 0 && (admin || points >= PACK_COST);
  // the Starter Kit is the base pack: free, each photo painted straight away; points start after it
  const starterLeft = starterDoneAt(pet, state) ? 0 : packFor(pet.species).quest.filter((q) => !state.cards.some((c) => c.petId === pet.id && c.slotId === q.id)).length;

  function choose(task: Task | null) {
    forTask.current = task;
    input.current?.click();
  }
  async function share(f: File) {
    const task = forTask.current;
    setBusy(task?.id ?? "free");
    const url = URL.createObjectURL(f);
    const fd = new FormData();
    await appendPhoto(fd, "photo", f);
    fd.append("petId", pet.id);
    if (task) fd.append("task", task.id);
    if (!task && words.trim()) fd.append("words", words.trim());
    const r = await call<{ card: Card; earned: number; matched: boolean; task: string | null }>("/api/share", { method: "POST", body: fd });
    setBusy(null);
    if (!r) return URL.revokeObjectURL(url);
    const learned = t("{name} learned: {what}", { name: pet.name, what: r.card.observation });
    const text = r.matched
      ? `${t("Task done: {task}.", { task: t(r.task ?? "") })} ${learned}`
      : task
        ? `${t("This one doesn't look like “{task}” to {name}.", { task: t(task.label), name: pet.name })} ${t(r.earned ? "Kept as a free share." : "Kept as a memory.")} ${learned}`
        : learned;
    setResults((x) => [{ url, text, earned: r.earned }, ...x]);
    if (!task) setWords("");
    await onChange();
  }
  async function open() {
    setPhase("sealed");
    const r = await call<{ cards: Card[]; bonus: string | null; levelBefore: number; levelAfter: number }>("/api/pack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId: pet.id }) });
    if (!r) return setPhase("idle");
    setFresh(r.cards);
    setBonus(r.bonus);
    setShown(0);
    setLevelUp(r.levelAfter > r.levelBefore ? [r.levelBefore, r.levelAfter] : null);
    setPhase("reveal");
  }
  async function done() {
    await onChange();
    setPhase("idle");
    setFresh([]);
    setBonus(null);
  }
  const total = fresh.length + (bonus ? 1 : 0);

  if (phase === "reveal")
    return (
      <section className="mt-2 text-center">
        <div data-coco-spot="pack" data-coco-side="right" className="mx-auto grid max-w-3xl grid-cols-2 gap-5 text-left sm:grid-cols-4">
          {fresh.map((c, i) => (
            <button key={c.id} onClick={() => i === shown && setShown(shown + 1)} className={`flip block aspect-[63/88] w-full ${i < shown ? "flipped" : ""} ${i === shown ? "ring-4 ring-[var(--gold)]/50 rounded-2xl animate-pulse" : ""}`}>
              <div className="flip-inner">
                <div className="flip-face"><div className="pack h-full w-full rounded-2xl" /></div>
                <div className="flip-face front">
                  <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line={c.line} stars={c.rarity} label={`${pet.name} · ${c.style}`} />
                </div>
              </div>
            </button>
          ))}
          {bonus && (
            <div className="relative">
              <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#f5d27a] px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-[.14em] text-[#1f1d33] shadow">{t("Bonus")}</span>
              <button onClick={() => shown === fresh.length && setShown(shown + 1)} className={`flip block aspect-[63/88] w-full ${shown > fresh.length ? "flipped" : ""} ${shown === fresh.length ? "rounded-2xl ring-4 ring-[#f5d27a]/70 animate-pulse" : ""}`}>
                <div className="flip-inner">
                  <div className="flip-face"><div className="h-full w-full overflow-hidden rounded-2xl" style={{ background: "linear-gradient(165deg, #14112a, #2a1f55 55%, #3d2470)" }}><div className="pack-holo h-full w-full" /></div></div>
                  <div className="flip-face front"><MoveCard pet={pet} mood={bonus} owned={{ mood: bonus, at: "", from: "pack" }} /></div>
                </div>
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 text-[14px] text-[var(--ink2)]">
          {shown < fresh.length ? t("Tap the glowing card to turn it over.") : bonus && shown === fresh.length ? <b className="text-[var(--ink)]">{t("Something extra fell out of the pack. Tap it.")}</b> : bonus ? <b className="text-[var(--ink)]">{t("A move card: {move}. {name} can do this now.", { move: t(moveOf(bonus)?.name ?? bonus), name: pet.name })}</b> : levelUp ? <b className="text-[var(--ink)]">{t("{name}'s picture just got sharper: clarity {a} → {b}.", { name: pet.name, a: levelUp[0], b: levelUp[1] })}</b> : t("All turned over.")}
        </div>
        {shown >= total && <button onClick={done} className="mt-3 rounded-xl bg-[var(--ink)] px-4 py-2 text-[14px] font-semibold text-white">{t("Add to my collection")}</button>}
      </section>
    );

  return (
    <section className="grid gap-6">
      <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) share(f); }} />

      {starterLeft > 0 && (
        <Link href="/app/cards#starter" className="flex items-center gap-4 rounded-[20px] p-4 text-white" style={{ background: "linear-gradient(165deg, #0d4f57, #137a74 48%, #3fb59a)" }}>
          <PackArt kind="starter" art={petArt(pet)} className="w-14 shrink-0 -rotate-6" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-bold uppercase tracking-[.2em] text-[#ffd27a]">{t("Start here · free")}</span>
            <span className="serif block text-[19px] font-bold leading-tight">{t(starterLeft > 1 ? "Your Starter Kit: {n} cards to go" : "Your Starter Kit: {n} card to go", { n: starterLeft })}</span>
            <span className="block text-[13px] opacity-90">{t("Each photo becomes a card right away, no M pt needed. Finish it for the first move card.")}</span>
          </span>
        </Link>
      )}

      {/* points and the pack */}
      <div className="ws-card flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-center">
        <div data-coco-spot="pack" data-coco-side="left" className="w-[min(170px,44vw)] shrink-0">
          <PackArt kind="booster" art={petArt(pet)} title={phase === "sealed" ? t("Painting…") : waiting ? t(Math.min(waiting, 3) === 1 ? "{n} memory" : "{n} memories", { n: Math.min(waiting, 3) }) : t("Empty for now")} sub={phase === "sealed" ? t("about half a minute") : undefined} badge={`${PACK_COST} M pt`} sealed={phase === "sealed"} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{t("M pt · Memory points")}</div>
          <div className="serif text-[52px] font-bold leading-none">{points}</div>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink2)]">
            {waiting ? t(waiting === 1 ? "{n} shared memory is waiting to become an M Print." : "{n} shared memories are waiting to become M Prints.", { n: waiting }) : t("Share a memory below; a pack paints your shared memories into M Prints.")} {t("A Daily Booster costs {n} M pt and paints up to three, each in a style you won't know until it turns over.", { n: PACK_COST })}
          </p>
          <button disabled={!canOpen || phase === "sealed"} onClick={open} className="pack mt-3 rounded-xl px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-40">
            {phase === "sealed" ? t("Painting your cards…") : t("Open a pack · {n} M pt", { n: PACK_COST })}
          </button>
          {!canOpen && phase !== "sealed" && <div className="mt-1.5 text-[12.5px] text-[var(--ink3)]">{!waiting ? t("Nothing to paint yet.") : t("{n} more M pt to go.", { n: PACK_COST - points })}</div>}
        </div>
      </div>

      {/* today's tasks */}
      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="serif text-[20px] font-bold">{t("Today's tasks")}</h3>
          <span className="text-[13px] text-[var(--ink2)]">{t("+{n} M pt each · moments {name} doesn't know yet", { n: TASK_POINTS, name: pet.name })}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {tasks.map((k) => (
            <div key={k.id} className="ws-card relative overflow-hidden p-4">
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: k.colour }} />
              <div className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: k.colour }}>{t(k.series)}</div>
              <div className="serif mt-1 text-[18px] font-bold leading-tight">{t(k.label)}</div>
              <div className="mt-0.5 text-[13px] text-[var(--ink2)]">{t("Find a photo: {hint}.", { hint: t(k.hint) })}</div>
              {k.done ? (
                <div className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#1f7a46]"><Check size={15} /> {t("Done · +{n} M pt", { n: TASK_POINTS })}</div>
              ) : (
                <button disabled={!!busy} onClick={() => choose(k)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-[13.5px] font-semibold disabled:opacity-50">
                  <ImagePlus size={15} /> {busy === k.id ? t("Reading…") : t("Find a photo · +{n} M pt", { n: TASK_POINTS })}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* free shares */}
      <div className="ws-card p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="serif text-[20px] font-bold">{t("Share any moment")}</h3>
          <span className="text-[13px] text-[var(--ink2)]">{t("+1 M pt each · {a} of {b} left today", { a: freeLeft, b: FREE_PER_DAY })}</span>
        </div>
        <p className="mt-1 text-[13.5px] text-[var(--ink2)]">{t("Any day of your life together. Add a few words if you like; your words teach {name} what no photo shows.", { name: pet.name })}</p>
        <textarea value={words} onChange={(e) => setWords(e.target.value)} rows={2} maxLength={500} placeholder={t("Anything to tell {name} about it? (optional)", { name: pet.name })} className="mt-3 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--gold)]" />
        <button disabled={!!busy || freeLeft <= 0} onClick={() => choose(null)} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-40">
          <ImagePlus size={15} /> {busy === "free" ? t("Reading…") : freeLeft > 0 ? t("Choose a photo · +1 M pt") : t("Come back tomorrow")}
        </button>
        <p className="mt-2 text-[12px] text-[var(--ink3)]">{t("People's faces are blurred on your device before anything is uploaded.")}</p>
      </div>

      {/* what just happened */}
      {results.length > 0 && (
        <div className="grid gap-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 pr-4 shadow-[0_6px_18px_-12px_rgba(40,30,90,.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt="" className="h-14 w-11 shrink-0 rounded-lg object-cover" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              <div className="min-w-0 flex-1 text-[13.5px] leading-snug">{r.text}</div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-bold ${r.earned ? "bg-[#efe9ff] text-[#5b3fb0]" : "bg-[#eeebf8] text-[var(--ink3)]"}`}>{r.earned ? <><Sparkles size={12} className="-mt-0.5 mr-0.5 inline" />+{r.earned}</> : "+0"}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
