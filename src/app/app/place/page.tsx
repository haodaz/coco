"use client";

import Shell, { PageHead, Rule } from "@/components/Shell";
import { AreaPicker, FactCard, HomeForm, Services, usePlace } from "@/components/PlaceView";
import { CocoLoader } from "@/components/Loading";

// Around us: where the owner and the pet live, and what is true there right now. The pet checks this
// (weather, the parked-car check, rules) before it speaks up about a plan.
export default function PlacePage() {
  const { data, reload } = usePlace();
  return (
    <Shell>
      {({ pet, t }) => {
        const place = data?.place ?? null;
        const now = data?.facts.filter((f) => f.kind === "weather" || f.kind === "check") ?? [];
        const rules = data?.facts.filter((f) => f.kind === "rule") ?? [];
        return (
          <div>
            <PageHead
              eyebrow={t("Around us")}
              art="place"
              title={place ? t("{name} in {place}", { name: pet.name, place: place.name }) : t("Where do you and {name} live?", { name: pet.name })}
              sub={place ? place.area : undefined}
              lead={t("Before {name} speaks up about a plan, like a trip to the shop or a wait in the car, it checks the weather and the rules here. Every fact shows where it comes from and when it was checked.", { name: pet.name })}
            />
            <div className="max-w-xl">
              <AreaPicker current={place?.area} onPicked={reload} />
            </div>
            {!data && <div className="mt-10"><CocoLoader size="sm" label={t("Checking the weather and the rules…")} /></div>}
            {place && (
              <>
                <Rule label={t("Right now")} />
                {now.length ? (
                  <div className="grid gap-3 md:grid-cols-3">{now.map((f) => <FactCard key={f.id} fact={f} />)}</div>
                ) : (
                  <p className="text-[14px] text-[var(--ink2)]">{t("The weather service didn't answer. Try again in a minute.")}</p>
                )}
                <Rule label={t("Rules here")} />
                <div className="grid gap-3 md:grid-cols-3">{rules.map((f) => <FactCard key={f.id} fact={f} />)}</div>
                <Rule label={t("Our home")} />
                <div className="max-w-xl"><HomeForm place={place} onSaved={reload} /></div>
                <Rule label={t("Pet places nearby")} />
                <Services place={place} onChanged={reload} />
              </>
            )}
          </div>
        );
      }}
    </Shell>
  );
}
