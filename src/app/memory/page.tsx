"use client";

import { Lock } from "lucide-react";
import MemoryPanel from "@/components/MemoryPanel";
import Shell from "@/components/Shell";

// Memory: how well the AI knows the pet, and the road from a two-colour mosaic to the full picture.
export default function MemoryPage() {
  return (
    <Shell>
      {({ pet, memory }) =>
        memory && (
          <div className="space-y-8">
            <MemoryPanel pet={pet} memory={memory} />
            <section>
              <h2 className="text-[18px] font-bold">How the picture sharpens</h2>
              <p className="mt-1 text-[14px] text-[var(--sub)]">Every card, every day of {pet.name}&apos;s life in them, and every word from you adds detail. Locked levels open as you share more.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
                {Array.from({ length: memory.maxLevel + 1 }, (_, l) => (
                  <div key={l} className="text-center">
                    {l <= memory.level ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/likeness/${pet.id}?level=${l}&p=${memory.points}`} alt="" className={`aspect-[3/4] w-full rounded-lg object-cover [image-rendering:pixelated] ${l === memory.level ? "ring-2 ring-[var(--primary)] ring-offset-2" : ""}`} />
                    ) : (
                      <div className="grid aspect-[3/4] w-full place-items-center rounded-lg bg-[#eceef5] text-[#a3a8b8]"><Lock size={16} /></div>
                    )}
                    <div className="mt-1 text-[11.5px] text-[var(--sub)]">Level {l}</div>
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
