"use client";

import Shell, { PageHead, Rule } from "@/components/Shell";
import { AreaPicker, FactCard, HomeForm, Services, usePlace } from "@/components/PlaceView";

// Around us: where the owner and the pet live, and what is true there right now. The pet checks this
// (weather, the parked-car check, rules) before it speaks up about a plan.
export default function PlacePage() {
  const { data, reload } = usePlace();
  return (
    <Shell>
      {({ pet }) => {
        const place = data?.place ?? null;
        const now = data?.facts.filter((f) => f.kind === "weather" || f.kind === "check") ?? [];
        const rules = data?.facts.filter((f) => f.kind === "rule") ?? [];
        return (
          <div>
            <PageHead
              eyebrow="Around us"
              art="place"
              title={place ? `${pet.name} in ${place.name}` : `Where do you and ${pet.name} live?`}
              sub={place ? place.area : undefined}
              lead={`Before ${pet.name} speaks up about a plan, like a trip to the shop or a wait in the car, it checks the weather and the rules here. Every fact shows where it comes from and when it was checked.`}
            />
            <div className="max-w-xl">
              <AreaPicker current={place?.area} onPicked={reload} />
            </div>
            {!data && <p className="mt-6 text-[14px] text-[var(--ink3)]">Checking…</p>}
            {place && (
              <>
                <Rule label="Right now" />
                {now.length ? (
                  <div className="grid gap-3 md:grid-cols-3">{now.map((f) => <FactCard key={f.id} fact={f} />)}</div>
                ) : (
                  <p className="text-[14px] text-[var(--ink2)]">The weather service didn&apos;t answer. Try again in a minute.</p>
                )}
                <Rule label="Rules here" />
                <div className="grid gap-3 md:grid-cols-3">{rules.map((f) => <FactCard key={f.id} fact={f} />)}</div>
                <Rule label="Our home" />
                <div className="max-w-xl"><HomeForm place={place} onSaved={reload} /></div>
                <Rule label="Pet places nearby" />
                <Services place={place} onChanged={reload} />
              </>
            )}
          </div>
        );
      }}
    </Shell>
  );
}
