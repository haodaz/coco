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
import Shell, { PageHead, Rule } from "@/components/Shell";
import { finishFor } from "@/lib/finish";
import { balance, PACK_COST, sealedPrints, tasksFor } from "@/lib/points";
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
      {({ pet, state, memory, openCard }) => {
        const cards = state.cards.filter((c) => c.petId === pet.id);
        const r = rhythm(cards);
        const recent = cards.filter((c) => c.kind !== "legendary" && !c.sealed).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
        const threads = (state.threads ?? []).filter((t) => t.petId === pet.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
        const latest = cards.filter((c) => c.kind === "daily" && !c.sealed).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        const t = { tasksLeft: tasksFor(state, pet).filter((x) => !x.done).length, points: balance(state, pet.id), canOpen: sealedPrints(state, pet.id).length > 0 && (state.admin || balance(state, pet.id) >= PACK_COST) };
        const line = t.tasksLeft ? `There's a moment of ours I'd love to see today. Will you find it?` : latest ? latest.line : `Ask me anything about us.`;
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
              <HomeMobile pet={pet} greeting={greeting()} line={line} r={r} today={t} memory={memory} cardCount={cards.filter((c) => !c.sealed).length} recent={recent} threads={threads} openCard={openCard} ask={go} />
            </div>
            <div className="home-d">
            <PageHead eyebrow="Home" art="home" title={greeting()} sub={`Your co-world with ${pet.name}`} />

            <div className="grid gap-5 sm:mt-16 lg:grid-cols-3">
              {/* the pet, ready to talk */}
              <section className="ws-card relative mt-10 flex flex-col gap-4 p-5 sm:mt-0 sm:min-h-[260px] sm:flex-row sm:items-end sm:pl-[268px] lg:col-span-2">
                {/* the pet stands on the card's floor and breaks out of its top edge */}
                <div className="pointer-events-none relative mx-auto -mb-6 -mt-24 aspect-[768/1057] w-[240px] shrink-0 sm:absolute sm:-bottom-[26px] sm:-left-2 sm:mx-0 sm:mb-0 sm:mt-0 sm:w-[310px] [&>*]:pointer-events-auto">
                  {pet.character ? (
                    <HomePet moods={pet.character.moods} version={pet.character.at} eager={t.tasksLeft > 0} className="h-full w-full" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/photos/${pet.avatarPhotoId}`} alt="" className="h-full w-full rounded-2xl object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="relative rounded-2xl rounded-bl-md bg-[var(--paper)] px-4 py-3">
                    <div className="serif text-[19px] italic leading-snug">“{line}”</div>
                    <div className="mt-1 text-[12px] text-[var(--ink3)]">— {pet.name}</div>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); if (say.trim()) go(say.trim()); }} className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-2 py-1.5 focus-within:border-[var(--gold)]">
                    <input value={say} onChange={(e) => setSay(e.target.value)} placeholder={`Say something to ${pet.name}`} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[15px] outline-none" />
                    <button disabled={!say.trim()} className="rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[13.5px] font-semibold text-white disabled:opacity-40">Talk</button>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["What do you love most?", "What did we do this week?"].map((q) => (
                      <button key={q} onClick={() => go(q)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12.5px] text-[var(--ink2)] hover:border-[var(--gold)]">{q}</button>
                    ))}
                  </div>
                </div>
              </section>

              {/* today: tasks, points, a pack */}
              <Link href="/app/pack" className="pack group relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-[22px] p-5 text-white">
                <PackArt kind="booster" art={petArt(pet)} className="float-card absolute -right-2 -top-6 w-[46%] rotate-[10deg]" />
                <div className="relative">
                  <div className="text-[11px] font-bold uppercase tracking-[.2em] opacity-85">Today</div>
                  <div className="serif mt-1 text-[28px] font-bold leading-tight">{t.tasksLeft ? `${t.tasksLeft} task${t.tasksLeft > 1 ? "s" : ""} waiting` : "Tasks done for today"}</div>
                  <div className="mt-1 text-[13.5px] opacity-90">{t.points} M pt{t.canOpen ? " · enough for a pack" : ""}</div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13.5px] font-semibold text-[#3b2a8f] transition group-hover:gap-2.5">{t.canOpen ? "Open a pack" : "See today's tasks"} <ArrowRight size={15} /></div>
                </div>
              </Link>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <section className="ws-card p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]"><Flame size={13} /> Streak</div>
                <div className="serif mt-1 text-[40px] font-bold leading-none">{r.streak}<span className="ml-1 text-[16px] font-medium text-[var(--ink2)]">day{r.streak === 1 ? "" : "s"}</span></div>
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
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]"><Sparkles size={13} /> Clarity {memory?.level}/{memory?.maxLevel}</div>
                  <div className="serif mt-1 text-[18px] font-bold leading-tight">{memory?.name}</div>
                  {memory && (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${memory.next ? Math.round(((memory.points - memory.floor) / (memory.next - memory.floor)) * 100) : 100}%` }} /></div>
                      <div className="mt-1 text-[12px] text-[var(--ink2)]">{memory.next ? `${memory.next - memory.points} more to sharpen` : "fully clear"}</div>
                    </>
                  )}
                </div>
              </Link>
              <Link href="/app/cards" className="ws-card p-5 transition hover:border-[var(--gold)]">
                <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">Collection</div>
                <div className="serif mt-1 text-[40px] font-bold leading-none">{cards.filter((c) => !c.sealed).length}<span className="ml-1 text-[16px] font-medium text-[var(--ink2)]">cards</span></div>
                <div className="mt-3 text-[13px] text-[var(--ink2)]">{legends} legend{legends === 1 ? "" : "s"} · {lit}/{memory?.senses.length ?? 0} kinds of moment</div>
              </Link>
            </div>

            <Rule label="Latest memories" />
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {recent.map((c) => (
                <button key={c.id} onClick={() => openCard(c)} className="text-left">
                  <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line="" stars={c.rarity} label={pet.name} />
                </button>
              ))}
            </div>

            {threads.length > 0 && (
              <>
                <Rule label="Pick up a conversation" />
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
