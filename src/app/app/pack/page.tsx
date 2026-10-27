"use client";

import Companion from "@/components/Companion";
import DailyPack from "@/components/DailyPack";
import Shell, { PageHead } from "@/components/Shell";
import { rhythm } from "@/lib/rhythm";

// Today's pack: the daily ritual of adding one more memory, with a surprise in every card.
export default function PackPage() {
  return (
    <Shell>
      {({ pet, state, refresh }) => {
        const r = rhythm(state.cards.filter((c) => c.petId === pet.id));
        const her = pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their";
        return (
          <>
            <PageHead
              eyebrow="Today's pack"
              art="pack"
              title={r.left ? "A new pack is waiting." : "Today's pack is open."}
              sub={r.left ? `Up to ${r.left} more Memory Print${r.left > 1 ? "s" : ""} today` : `The next one arrives in ${r.nextPackIn}`}
              lead={`${r.left ? "Tap the pack to see what's inside. " : ""}${r.streak ? `${r.streak} day${r.streak > 1 ? "s" : ""} in a row so far.` : `Come back tomorrow and the days start to add up.`}`}
            />
            <DailyPack pet={pet} state={state} onChange={refresh} admin={state.admin} />
            {pet.character && <Companion moods={pet.character.moods} mood="idle" version={pet.character.at} home="pack" />}
            {r.today.length > 0 && !r.left && (
              <p className="mt-6 text-center text-[14px] text-[var(--ink2)]">Today you kept {r.today.length} memories of {pet.name}. You can find them in {her} cards.</p>
            )}
          </>
        );
      }}
    </Shell>
  );
}
