"use client";

import DailyPack from "@/components/DailyPack";
import Shell from "@/components/Shell";
import StarterPack from "@/components/StarterPack";

// Cards: the starter pack, today's booster pack, and the collection.
export default function Cards() {
  return (
    <Shell>
      {({ pet, state, refresh }) => (
        <div className="space-y-14">
          <DailyPack pet={pet} state={state} onChange={refresh} />
          <StarterPack pet={pet} state={state} onChange={refresh} />
        </div>
      )}
    </Shell>
  );
}
