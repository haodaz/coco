"use client";

import { ArrowRight, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import HomeMobile from "@/components/HomeMobile";
import HomePet from "@/components/HomePet";
import HoloCard from "@/components/HoloCard";
import PackArt from "@/components/PackArt";
import { petArt } from "@/components/PetFace";
import Shell, { Rule } from "@/components/Shell";
import { finishFor } from "@/lib/finish";
import { balance, PACK_COST, packOpenable, poolReady, tasksFor } from "@/lib/points";
import { rhythm } from "@/lib/rhythm";

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Still up?" : h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
};

// Home: the pet, ready to talk; today's pack; the streak and how well the AI knows the pet; the latest memories.
export default function Home() {
  const router = useRouter();
  const [say, setSay] = useState("");
  return (
    <Shell>
      {({ pet, state, memory, openCard, t: tr }) => {
        const cards = state.cards.filter((c) => c.petId === pet.id);
        const r = rhythm(cards);
        const recent = cards.filter((c) => c.kind !== "legendary" && !c.sealed).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
        const threads = (state.threads ?? []).filter((t) => t.petId === pet.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
        const latest = cards.filter((c) => c.kind === "daily" && !c.sealed).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        const t = { tasksLeft: tasksFor(state, pet).filter((x) => !x.done).length, points: balance(state, pet.id), ready: poolReady(state, pet.id).length, canOpen: packOpenable(state, pet.id) && (state.admin || balance(state, pet.id) >= PACK_COST) };
        const line = t.tasksLeft ? tr("There's a moment of ours I'd love to see today. Will you find it?") : latest ? latest.line : tr("Ask me anything about us.");
        const legends = cards.filter((c) => c.rarity === 3).length;
        const lit = memory?.senses.filter((s) => s.imprints).length ?? 0;
        const week = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const key = d.toLocaleDateString("en-CA");
          return { key, label: d.toLocaleDateString(undefined, { weekday: "narrow" }), kept: cards.some((c) => c.kind === "daily" && new Date(c.createdAt).toLocaleDateString("en-CA") === key) };
        });
        const go = (q: string) => router.push(`/app/chat?q=${encodeURIComponent(q)}`);
        return (
          <>
            {/* phones get their own Home, one thing per row */}
            <div className="home-m">
              <HomeMobile pet={pet} greeting={tr(greeting())} line={line} r={r} today={t} memory={memory} cardCount={cards.filter((c) => !c.sealed).length} recent={recent} threads={threads} openCard={openCard} ask={go} />
            </div>
            <div className="home-d">
            <div className="grid gap-5 pt-2 lg:grid-cols-3">
              {/* the pet, ready to talk: the greeting sits in the card beside it, on a soft sky of the cocoverse */}
              <section className="relative flex min-h-[300px] flex-col gap-4 overflow-visible rounded-[22px] p-5 pl-[268px] lg:col-span-2" style={{ background: "radial-gradient(70% 90% at 15% 100%, rgba(255,255,255,.75), transparent 60%), linear-gradient(135deg, #e9e2ff 0%, #f6e4f3 55%, #fdf0e3 100%)", boxShadow: "0 18px 40px -26px rgba(60,40,140,.45), inset 0 0 0 1px rgba(255,255,255,.7)" }}>
                <div className="relative">
                  <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{tr("Home")}</div>
                  <h1 className="serif mt-1 text-[38px] font-bold leading-[1.05] tracking-tight">{tr(greeting())}</h1>
                  <div className="serif mt-0.5 text-[16px] italic text-[var(--ink2)]">{tr("Your cocoverse with {name}", { name: pet.name })}</div>
                </div>
                {/* the pet stands on the card's floor and breaks out of its top edge; before it has a character, its
                    photo sits inside the card as a portrait, with a way to bring it to life */}
                {pet.character ? (
                  <div className="pointer-events-none absolute -bottom-[26px] -left-2 aspect-[768/1057] w-[310px] [&>*]:pointer-events-auto">
                    <HomePet moods={pet.character.moods} version={pet.character.at} eager={t.tasksLeft > 0} className="h-full w-full" />
                  </div>
                ) : (
                  <Link href="/app/chat" className="absolute bottom-5 left-6 w-[214px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${pet.avatarPhotoId}`} alt="" className="aspect-[3/4] w-full rounded-[18px] object-cover shadow-[0_14px_30px_-16px_rgba(40,30,90,.5)]" />
                    <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/90 px-3 py-1.5 text-center text-[12px] font-semibold text-[var(--ink)] shadow-sm">{tr("Bring {name} to life →", { name: pet.name })}</span>
                  </Link>
                )}
                <div className="my-auto min-w-0 pt-5 pb-1">
                  <div className="relative rounded-2xl rounded-bl-md bg-white/90 px-4 py-3 shadow-[0_8px_20px_-14px_rgba(40,30,90,.4)]">
                    <div className="serif text-[19px] italic leading-snug">“{line}”</div>
                    <div className="mt-1 text-[12px] text-[var(--ink3)]">— {pet.name}</div>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); if (say.trim()) go(say.trim()); }} className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-2 py-1.5 focus-within:border-[var(--gold)]">
                    <input value={say} onChange={(e) => setSay(e.target.value)} placeholder={tr("Say something to {name}", { name: pet.name })} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[15px] outline-none" />
                    <button disabled={!say.trim()} className="rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[13.5px] font-semibold text-white disabled:opacity-40">{tr("Talk")}</button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["What do you love most?", "What did we do this week?"].map((x) => tr(x)).map((q) => (
                      <button key={q} onClick={() => go(q)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12.5px] text-[var(--ink2)] hover:border-[var(--gold)]">{q}</button>
                    ))}
                  </div>
                </div>
              </section>

              {/* today: tasks, points, a pack */}
              <Link href="/app/pack" className="pack group relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[22px] p-5 text-white">
                <PackArt kind="booster" art={petArt(pet)} className="float-card absolute -right-2 -top-6 w-[46%] rotate-[10deg]" />
                <div className="relative">
                  <div className="text-[11px] font-bold uppercase tracking-[.2em] opacity-85">{tr("Today")}</div>
                  <div className="serif mt-1 text-[28px] font-bold leading-tight">{t.canOpen ? tr(t.ready > 1 ? "{n} cards ready in your pack" : "{n} card ready in your pack", { n: Math.min(t.ready, 3) }) : t.tasksLeft ? tr(t.tasksLeft > 1 ? "{n} tasks waiting" : "{n} task waiting", { n: t.tasksLeft }) : tr("Tasks done for today")}</div>
                  <div className="mt-1 text-[13.5px] opacity-90">{t.points} M pt{t.canOpen ? ` · ${tr("enough for a pack")}` : ""}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13.5px] font-semibold text-[#3b2a8f] transition group-hover:gap-2.5">{t.canOpen ? tr("Open a pack") : tr("See today's tasks")} <ArrowRight size={15} /></div>
                </div>
              </Link>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <section className="ws-card p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]"><Flame size={13} /> {tr("Streak")}</div>
                {r.streak ? (
                  <div className="serif mt-1 text-[40px] font-bold leading-none">{r.streak}<span className="ml-1 text-[16px] font-medium text-[var(--ink2)]">{tr(r.streak === 1 ? "day" : "days")}</span></div>
                ) : (
                  // no streak right now: an invitation, not a zero
                  <div className="serif mt-2 text-[22px] font-bold leading-tight">{tr("Start a new streak today")}</div>
                )}
                <div className="mt-3 flex gap-1.5">
                  {week.map((d) => (
                    <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                      <span className={`h-6 w-full rounded-md ${d.kept ? "bg-[var(--gold)]" : "bg-[#eeebf8]"}`} />
                      <span className="text-[10.5px] text-[var(--ink3)]">{d.label}</span>
                    </div>
                  ))}
                </div>
              </section>
              <Link href="/app/memory" className="ws-card flex gap-4 p-5 transition hover:border-[var(--gold)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/likeness/${pet.id}?p=${memory?.points ?? 0}`} alt="" className="aspect-[3/4] w-20 shrink-0 rounded-lg object-cover [image-rendering:pixelated]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]"><Sparkles size={13} /> {tr("Clarity")} {memory?.level}/{memory?.maxLevel}</div>
                  <div className="serif mt-1 text-[18px] font-bold leading-tight">{memory?.name}</div>
                  {memory && (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${memory.next ? Math.round(((memory.points - memory.floor) / (memory.next - memory.floor)) * 100) : 100}%` }} /></div>
                      <div className="mt-1 text-[12px] text-[var(--ink2)]">{memory.next ? tr("{n} more to sharpen", { n: memory.next - memory.points }) : tr("fully clear")}</div>
                    </>
                  )}
                </div>
              </Link>
              <Link href="/app/cards" className="ws-card p-5 transition hover:border-[var(--gold)]">
                <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{tr("Collection")}</div>
                <div className="serif mt-1 text-[40px] font-bold leading-none">{cards.filter((c) => !c.sealed).length}<span className="ml-1 text-[16px] font-medium text-[var(--ink2)]">{tr("cards")}</span></div>
                <div className="mt-3 text-[13px] text-[var(--ink2)]">{tr(legends === 1 ? "{n} legend" : "{n} legends", { n: legends })} · {tr("{a}/{b} kinds of moment", { a: lit, b: memory?.senses.length ?? 0 })}</div>
              </Link>
            </div>

            <Rule label={tr("Latest memories")} />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {recent.map((c) => (
                <button key={c.id} onClick={() => openCard(c)} className="text-left">
                  <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} plate={c.plate} finish={finishFor(c)} name={c.name} line="" stars={c.rarity} label={pet.name} />
                </button>
              ))}
            </div>

            {threads.length > 0 && (
              <>
                <Rule label={tr("Pick up a conversation")} />
                <div className="grid gap-4 md:grid-cols-3">
                  {threads.map((t) => (
                    <Link key={t.id} href={`/app/chat?thread=${t.id}`} className="ws-card p-4 transition hover:border-[var(--gold)]">
                      <div className="truncate text-[14px] font-semibold">{t.title}</div>
                      <div className="mt-1 line-clamp-2 text-[13px] text-[var(--ink2)]">{t.turns[t.turns.length - 1]?.answer}</div>
                    </Link>
                  ))}
                </div>
              </>
            )}
            </div>
          </>
        );
      }}
    </Shell>
  );
}
