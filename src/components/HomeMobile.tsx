"use client";

import { ArrowRight, ChevronRight, Flame, Layers, Sparkles } from "lucide-react";
import Link from "next/link";
import HomePet from "@/components/HomePet";
import PackArt from "@/components/PackArt";
import { petArt } from "@/components/PetFace";
import HoloCard from "@/components/HoloCard";
import type { Memory } from "@/components/MemoryPanel";
import { finishFor } from "@/lib/finish";
import { useT } from "@/lib/ui";
import type { rhythm } from "@/lib/rhythm";
import type { Card, Pet, Thread } from "@/lib/types";

// Home on a phone: one thing per row, nothing small and busy. The pet first, saying one line; today's pack as the one
// big button; three small numbers; the latest cards to swipe through; conversations to pick up.
export default function HomeMobile({
  pet,
  greeting,
  line,
  r,
  today,
  memory,
  cardCount,
  recent,
  threads,
  openCard,
  ask,
}: {
  pet: Pet;
  greeting: string;
  line: string;
  r: ReturnType<typeof rhythm>;
  today: { tasksLeft: number; points: number; canOpen: boolean };
  memory?: Memory;
  cardCount: number;
  recent: Card[];
  threads: Thread[];
  openCard: (c: Card) => void;
  ask: (q: string) => void;
}) {
  const { t } = useT();
  const progress = memory ? (memory.next ? Math.round(((memory.points - memory.floor) / (memory.next - memory.floor)) * 100) : 100) : 0;
  return (
    <div className="-mt-1">
      {/* the pet and its line */}
      <div className="serif text-[26px] font-bold leading-tight">{greeting}</div>
      <div className="serif text-[15px] italic text-[var(--ink2)]">{t("Your cocoverse with {name}", { name: pet.name })}</div>

      <section className="relative mt-2">
        {/* the pet beside its speech bubble, small enough to leave room for everything else */}
        <div className="flex items-end gap-1">
          <div className="relative aspect-[768/1057] w-[32%] max-w-[130px] shrink-0">
            <div className="absolute inset-x-[-10%] bottom-[2%] top-[30%] rounded-full bg-[radial-gradient(closest-side,rgba(109,79,209,.2),transparent)]" />
            {pet.character ? (
              <HomePet moods={pet.character.moods} version={pet.character.at} eager={today.tasksLeft > 0} className="h-full w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/photos/${pet.avatarPhotoId}`} alt="" className="relative h-full w-full rounded-2xl object-cover" />
            )}
          </div>
          <div className="relative mb-[14%] min-w-0 flex-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-[0_10px_28px_-14px_rgba(40,30,90,.35)]">
            <div className="serif text-[16px] italic leading-snug">“{line}”</div>
          </div>
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {["What do you love most?", "What did we do this week?", "Where do you like to sleep?"].map((x) => t(x)).map((q) => (
            <button key={q} onClick={() => ask(q)} className="shrink-0 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px] text-[var(--ink2)]">{q}</button>
          ))}
        </div>
      </section>

      {/* today: the one big button */}
      <Link href="/app/pack" className="pack relative mt-5 flex items-center gap-3 overflow-hidden rounded-[20px] p-4 text-white">
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-bold uppercase tracking-[.2em] opacity-85">{t("Today")}</div>
          <div className="serif mt-0.5 text-[22px] font-bold leading-tight">{today.tasksLeft ? t(today.tasksLeft > 1 ? "{n} tasks waiting" : "{n} task waiting", { n: today.tasksLeft }) : t("Tasks done for today")}</div>
          <div className="mt-0.5 text-[12.5px] opacity-90">{today.points} M pt{today.canOpen ? ` · ${t("enough for a pack")}` : ""}</div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#3b2a8f]">{today.canOpen ? t("Open a pack") : t("See today's tasks")} <ArrowRight size={14} /></div>
        </div>
        <PackArt kind="booster" art={petArt(pet)} className="float-card -my-6 -mr-1 w-[26%] shrink-0 rotate-[8deg]" />
      </Link>

      {/* three small numbers */}
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Link href="/app/pack" className="ws-card p-3">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--gold)]"><Flame size={12} /> {t("Streak")}</div>
          <div className="serif mt-1 text-[26px] font-bold leading-none">{r.streak}<span className="ml-1 text-[12px] font-medium text-[var(--ink2)]">{t(r.streak === 1 ? "day" : "days")}</span></div>
        </Link>
        <Link href="/app/memory" className="ws-card p-3">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--gold)]"><Sparkles size={12} /> {t("Clarity")}</div>
          <div className="serif mt-1 text-[26px] font-bold leading-none">{memory?.level ?? 0}<span className="ml-0.5 text-[12px] font-medium text-[var(--ink2)]">/{memory?.maxLevel ?? 8}</span></div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${progress}%` }} /></div>
        </Link>
        <Link href="/app/cards" className="ws-card p-3">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--gold)]"><Layers size={12} /> {t("Cards")}</div>
          <div className="serif mt-1 text-[26px] font-bold leading-none">{cardCount}</div>
        </Link>
      </div>

      {/* the latest cards, to swipe through */}
      {recent.length > 0 && (
        <>
          <div className="mt-6 flex items-baseline">
            <div className="serif text-[18px] font-bold">{t("Latest memories")}</div>
            <Link href="/app/cards" className="ml-auto flex items-center text-[13px] font-medium text-[var(--gold)]">{t("All")} <ChevronRight size={15} /></Link>
          </div>
          <div className="-mx-4 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {recent.map((c) => (
              <button key={c.id} onClick={() => openCard(c)} className="w-[38%] shrink-0 snap-start text-left">
                <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line="" stars={c.rarity} label={pet.name} idle={false} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* conversations to pick up */}
      {threads.length > 0 && (
        <>
          <div className="serif mt-5 text-[18px] font-bold">{t("Pick up where we left off")}</div>
          <div className="ws-card mt-2 divide-y divide-[var(--line)] overflow-hidden">
            {threads.map((t) => (
              <Link key={t.id} href={`/app/chat?thread=${t.id}`} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold">{t.title}</div>
                  <div className="truncate text-[13px] text-[var(--ink2)]">{t.turns[t.turns.length - 1]?.answer}</div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[var(--ink3)]" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
