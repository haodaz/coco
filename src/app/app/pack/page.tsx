"use client";

import Companion from "@/components/Companion";
import DailyPack from "@/components/DailyPack";
import Shell, { PageHead } from "@/components/Shell";
import { balance, tasksFor } from "@/lib/points";
import { rhythm } from "@/lib/rhythm";

// Today: teach the pet (today's tasks and free shares earn Memory Points) and open packs with the points.
export default function PackPage() {
  return (
    <Shell>
      {({ pet, state, refresh }) => {
        const r = rhythm(state.cards.filter((c) => c.petId === pet.id));
        const left = tasksFor(state, pet).filter((t) => !t.done).length;
        const points = balance(state, pet.id);
        return (
          <>
            <PageHead
              eyebrow="Today"
              art="pack"
              title={left ? `${left} task${left > 1 ? "s" : ""} for today` : "Today's tasks are done."}
              sub={`${points} M pt`}
              lead={`Every memory you share teaches ${pet.name} right away and earns M pt; M pt open packs that paint your memories into M Cards. ${r.streak ? `${r.streak} day${r.streak > 1 ? "s" : ""} in a row so far.` : ""}`}
            />
            <DailyPack pet={pet} state={state} onChange={refresh} admin={state.admin} />
            {pet.character && <Companion moods={pet.character.moods} mood="idle" version={pet.character.at} home="pack" />}
          </>
        );
      }}
    </Shell>
  );
}
