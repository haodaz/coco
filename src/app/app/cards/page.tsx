"use client";

import DailyPack from "@/components/DailyPack";
import Legend from "@/components/Legend";
import Shell from "@/components/Shell";
import StarterPack from "@/components/StarterPack";

// Cards: the soul portrait, today's booster pack, the collection, and the starter pack.
export default function Cards() {
  return (
    <Shell>
      {({ pet, state, refresh }) => (
        <div className="space-y-14">
          <Legend pet={pet} state={state} onChange={refresh} />
          <DailyPack pet={pet} state={state} onChange={refresh} />
          <StarterPack pet={pet} state={state} onChange={refresh} />
        </div>
      )}
    </Shell>
  );
}
