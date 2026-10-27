"use client";

import Collection from "@/components/Collection";
import Legend from "@/components/Legend";
import MoveCard from "@/components/MoveCard";
import { MOVE_CARDS, moveCards } from "@/lib/moves";
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
        const moves = moveCards(pet, state);
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
            <Rule label="Move cards · Special" />
            <p className="-mt-1 mb-4 text-[14px] text-[var(--ink2)]">
              Each move {pet.name} learns is a card too. The Starter Kit always gives the first; teach {pet.name} with more moments and your own words for the rest. {moves.length}/{MOVE_CARDS.length} so far.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {MOVE_CARDS.map((m) => <MoveCard key={m.mood} pet={pet} mood={m.mood} owned={moves.find((x) => x.mood === m.mood)} />)}
            </div>
            <Rule label="From daily packs" />
            <Collection pet={pet} cards={daily} openCard={openCard} />
            <Rule label="Starter Kit" />
            <StarterPack pet={pet} state={state} onChange={refresh} openCard={openCard} />
          </>
        );
      }}
    </Shell>
  );
}
