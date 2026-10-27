"use client";

import { Lock } from "lucide-react";
import { CocoMark } from "@/components/Brand";
import Character, { type Mood } from "@/components/Character";
import { moveOf, STARTER_MOVE, type MoveCard as Owned } from "@/lib/moves";
import type { Pet } from "@/lib/types";

// A move card: a Special card that holds one of the pet's moves, playing. Midnight frame with a holographic edge,
// the same family as the Special pack it comes out of. A move not learned yet shows how to get it.
export default function MoveCard({ pet, mood, owned, waiting = false, className = "" }: { pet: Pet; mood: string; owned?: Owned | null; waiting?: boolean; className?: string }) {
  const m = moveOf(mood);
  const drawn = !!pet.character?.moods[mood]?.length;
  const how = mood === STARTER_MOVE ? "Drops when you finish the Starter Kit" : waiting ? `${pet.name} learned this. It drops from one of your next packs` : `Teach ${pet.name} more (clarity ${m?.level}), then it can drop from a pack`;
  return (
    <div className={`move-card relative aspect-[63/88] [container-type:inline-size] ${owned ? "" : "opacity-80"} ${className}`}>
      <div className="absolute inset-0 overflow-hidden rounded-[6cqw] p-[3.2cqw]" style={{ background: "linear-gradient(165deg, #14112a, #2a1f55 55%, #3d2470)" }}>
        {owned && <div className="pack-holo absolute inset-0 opacity-60" />}
        <div className="relative flex h-full flex-col overflow-hidden rounded-[4cqw] bg-[linear-gradient(180deg,#f7f3ff,#ece4ff)]">
          <div className="flex items-center gap-[2cqw] px-[4cqw] pt-[3.5cqw]">
            <CocoMark style={{ width: "9cqw", height: "6.2cqw" }} />
            <span className="font-black uppercase text-[#5b3fb0]" style={{ fontSize: "4.6cqw", letterSpacing: ".14em" }}>Move</span>
            <span className="ml-auto rounded-full bg-[#14112a] px-[2.4cqw] py-[.6cqw] font-bold uppercase text-[#f5d27a]" style={{ fontSize: "3.4cqw", letterSpacing: ".1em" }}>Special</span>
          </div>
          <div className="relative mx-[4cqw] mt-[3cqw] flex-1 overflow-hidden rounded-[3cqw] bg-[radial-gradient(closest-side,rgba(255,255,255,1),rgba(214,200,255,.6)_70%,rgba(214,200,255,.3))]">
            {owned && drawn && pet.character ? (
              <div className="absolute inset-[4%]"><Character moods={pet.character.moods} mood={mood as Mood} version={pet.character.at} className="h-full w-full" interactive /></div>
            ) : (
              <div className="absolute inset-0 grid place-items-center text-[#9a8fd0]">
                {owned ? <span style={{ fontSize: "5cqw" }}>Drawing…</span> : <Lock style={{ width: "14cqw", height: "14cqw" }} strokeWidth={1.6} />}
              </div>
            )}
          </div>
          <div className="px-[4cqw] pb-[4cqw] pt-[3cqw]">
            <div className="font-bold leading-tight text-[#1f1d33]" style={{ fontSize: "7.4cqw", fontFamily: "Fraunces, Georgia, serif" }}>{m?.name ?? mood}</div>
            <div className="mt-[1.2cqw] leading-snug text-[#5c5a75]" style={{ fontSize: "4.3cqw" }}>{owned ? m?.when : how}</div>
            <div className="mt-[2cqw] font-semibold uppercase text-[#9a97b3]" style={{ fontSize: "3.3cqw", letterSpacing: ".12em" }}>
              {pet.name} · {owned ? (owned.from === "starter" ? "Starter Kit bonus" : "Pack bonus") : waiting ? "Learned" : "Locked"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
