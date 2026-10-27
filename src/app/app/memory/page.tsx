"use client";

import { Lock } from "lucide-react";
import Character, { type Mood } from "@/components/Character";
import { MOVES } from "@/lib/moves";
import MemoryPanel from "@/components/MemoryPanel";
import Shell, { PageHead, Rule } from "@/components/Shell";

// Memory: how well the AI knows the pet, and the road from a two-colour mosaic to the full picture.
export default function MemoryPage() {
  return (
    <Shell>
      {({ pet, memory }) =>
        memory && (
          <div>
            <PageHead
              eyebrow="Memory"
              art="memory"
              portrait={`/api/likeness/${pet.id}?p=${memory.points}`}
              title={`How well I know ${pet.name}`}
              sub={memory.name}
              lead={`Everything ${pet.name}'s AI knows comes from your Memory Prints: more cards, more kinds of moment, more days of ${pet.name}'s life and more of your words make the picture sharper.`}
            />
            <MemoryPanel pet={pet} memory={memory} />
            <Rule label="Moves" />
            <p className="text-[14px] text-[var(--ink2)]">{pet.name} starts simple. Each clarity level teaches new moves; tap a move to see it.</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {MOVES.map((m) => {
                const open = memory.level >= m.level;
                const drawn = !!pet.character?.moods[m.mood]?.length;
                return (
                  <div key={m.mood} className={`ws-card p-3 text-center ${open ? "" : "opacity-70"}`}>
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-[120px]">
                      {open && drawn && pet.character ? (
                        <Character moods={pet.character.moods} mood={m.mood as Mood} version={pet.character.at} className="h-full w-full" interactive />
                      ) : (
                        <div className="grid h-full place-items-center rounded-xl bg-[#efe8da] text-[var(--ink3)]">{open ? <span className="text-[11.5px]">Drawing…</span> : <Lock size={18} />}</div>
                      )}
                    </div>
                    <div className="serif mt-2 text-[15px] font-bold leading-tight">{m.name}</div>
                    <div className="mt-0.5 text-[11.5px] leading-snug text-[var(--ink3)]">{open ? m.when : `Unlocks at clarity ${m.level}`}</div>
                  </div>
                );
              })}
            </div>
            <Rule label="How the picture sharpens" />
            <section>
              <p className="text-[14px] text-[var(--ink2)]">Locked levels open as you share more. About a month of daily packs brings out {pet.name}&apos;s own features.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                {Array.from({ length: memory.maxLevel + 1 }, (_, l) => (
                  <div key={l} className="text-center">
                    {l <= memory.level ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/likeness/${pet.id}?level=${l}&p=${memory.points}`} alt="" className={`aspect-[3/4] w-full rounded-lg object-cover [image-rendering:pixelated] ${l === memory.level ? "ring-2 ring-[var(--gold)] ring-offset-2" : ""}`} />
                    ) : (
                      <div className="grid aspect-[3/4] w-full place-items-center rounded-lg bg-[#efe8da] text-[var(--ink3)]"><Lock size={16} /></div>
                    )}
                    <div className="mt-1 text-[11.5px] text-[var(--ink3)]">Level {l}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )
      }
    </Shell>
  );
}
