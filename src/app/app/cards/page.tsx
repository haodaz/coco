"use client";

import Collection from "@/components/Collection";
import Legend from "@/components/Legend";
import Shell, { PageHead, Rule } from "@/components/Shell";
import StarterPack from "@/components/StarterPack";

// Cards: every Memory Print the pet's AI keeps, each in its card: the soul portrait, the collection, the starter pack.
export default function Cards() {
  return (
    <Shell>
      {({ pet, state, refresh, openCard }) => {
        const mine = state.cards.filter((c) => c.petId === pet.id);
        const daily = mine.filter((c) => c.kind === "daily").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const legends = mine.filter((c) => c.rarity === 3).length;
        return (
          <>
            <PageHead
              eyebrow="Cards"
              art="cards"
              title={`${pet.name}'s collection`}
              sub={`${mine.length} cards · ${legends} legend${legends === 1 ? "" : "s"}`}
              lead="Each card holds one Memory Print: a moment that really happened. Open any card to see what it keeps, add your words, or talk about it."
            />
            <Legend pet={pet} state={state} onChange={refresh} openCard={openCard} />
            <Rule label="From daily packs" />
            <Collection pet={pet} cards={daily} openCard={openCard} />
            <Rule label="Starter pack" />
            <StarterPack pet={pet} state={state} onChange={refresh} openCard={openCard} />
          </>
        );
      }}
    </Shell>
  );
}
