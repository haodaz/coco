"use client";

import Legend from "@/components/Legend";
import MoveCard from "@/components/MoveCard";
import MyCards from "@/components/MyCards";
import SeriesView from "@/components/SeriesView";
import Shell, { PageHead, Rule } from "@/components/Shell";
import StarterPack from "@/components/StarterPack";
import { MOVE_CARDS, moveCards, starterDoneAt, waitingMoves } from "@/lib/moves";
import { seriesProgress } from "@/lib/series";

// Cards: the soul portrait; themed series to collect over time (by who the pet is, not by which pack a card came
// from); move cards, which drop as bonus cards from packs; all the owner's cards, theirs to sort, star and arrange;
// and the Starter Kit while it is still being filled.
export default function Cards() {
  return (
    <Shell>
      {({ pet, state, refresh, openCard, t }) => {
        const mine = state.cards.filter((c) => c.petId === pet.id && !c.sealed); // shared memories not opened yet aren't cards
        const memories = mine.filter((c) => c.kind !== "legendary");
        const legends = mine.filter((c) => c.rarity === 3).length;
        const moves = moveCards(pet, state);
        const waiting = waitingMoves(pet, state).map((m) => m.mood);
        const series = seriesProgress(state, pet);
        const complete = series.filter((s) => s.filled === s.slots.length).length;
        const starterDone = !!starterDoneAt(pet, state);
        return (
          <>
            <PageHead
              eyebrow={t("Cards")}
              art="cards"
              title={t("{name}'s collection", { name: pet.name })}
              sub={`${t(memories.length === 1 ? "{n} M Print" : "{n} M Prints", { n: memories.length })} · ${t(moves.length === 1 ? "{n} move card" : "{n} move cards", { n: moves.length })} · ${t(legends === 1 ? "{n} legend" : "{n} legends", { n: legends })}`}
              lead={t("Each M Print is one moment that really happened, as the AI keeps it. Fill the series over time, star your favourites and arrange them your way.")}
            />
            <Legend pet={pet} state={state} onChange={refresh} openCard={openCard} />

            {/* until the Starter Kit is full it comes first: it is what a new owner is here to do */}
            {!starterDone && (
              <>
                <Rule label={t("Getting started · Starter Kit")} />
                <div id="starter" className="scroll-mt-20"><StarterPack pet={pet} state={state} onChange={refresh} openCard={openCard} /></div>
              </>
            )}

            <Rule label={t("Series · {a}/{b} complete", { a: complete, b: series.length })} />
            <p className="-mt-1 mb-4 text-[14px] text-[var(--ink2)]">
              {t("Series follow who {name} is: favourite things, food, games, friends, places, the seasons and the hours of a day. A card can count in more than one. Keep sharing moments and they fill up; the seasons take a whole year.", { name: pet.name })}
            </p>
            <SeriesView pet={pet} state={state} openCard={openCard} />

            <Rule label={t("Move cards · {a}/{b}", { a: moves.length, b: MOVE_CARDS.length })} />
            <p className="-mt-1 mb-4 text-[14px] text-[var(--ink2)]">
              {t("Each move {name} learns is a Special card that drops as a bonus out of a pack. Finishing the Starter Kit always drops the first; teach {name} with more moments and your own words for the rest.", { name: pet.name })}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {MOVE_CARDS.map((m) => <MoveCard key={m.mood} pet={pet} mood={m.mood} owned={moves.find((x) => x.mood === m.mood)} waiting={waiting.includes(m.mood)} />)}
            </div>

            <Rule label={t("All my cards")} />
            <MyCards pet={pet} cards={memories} openCard={openCard} onChange={refresh} />

            {starterDone && (
              <>
                <Rule label={t("Starter Kit · complete")} />
                <div id="starter" className="scroll-mt-20"><StarterPack pet={pet} state={state} onChange={refresh} openCard={openCard} /></div>
              </>
            )}
          </>
        );
      }}
    </Shell>
  );
}
