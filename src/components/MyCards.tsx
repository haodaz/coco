"use client";

import { ArrowLeftRight, Star } from "lucide-react";
import { useState } from "react";
import HoloCard from "@/components/HoloCard";
import { call } from "@/lib/api";
import { finishFor } from "@/lib/finish";
import type { Card, Pet } from "@/lib/types";
import { useT } from "@/lib/ui";

type Sort = "mine" | "newest" | "rarity" | "starred";
const SORTS: { id: Sort; label: string }[] = [
  { id: "mine", label: "My order" },
  { id: "newest", label: "Newest" },
  { id: "rarity", label: "Rarity" },
  { id: "starred", label: "Starred" },
];

// All the owner's memory cards, theirs to arrange: sort by their own order, newest or rarity, star favourites,
// and in "Arrange" tap a card, then tap where it should go.
export default function MyCards({ pet, cards, openCard, onChange }: { pet: Pet; cards: Card[]; openCard: (c: Card) => void; onChange: () => void }) {
  const [sort, setSort] = useState<Sort>("mine");
  const { t } = useT();
  const [arranging, setArranging] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [local, setLocal] = useState<string[] | null>(null); // order while arranging
  const [stars, setStars] = useState<Record<string, boolean>>({});
  const starred = (c: Card) => stars[c.id] ?? !!c.starred;

  const mine = [...cards].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || b.createdAt.localeCompare(a.createdAt));
  let list =
    sort === "newest" ? [...cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : sort === "rarity" ? [...cards].sort((a, b) => b.rarity - a.rarity || b.createdAt.localeCompare(a.createdAt))
    : sort === "starred" ? mine.filter(starred)
    : mine;
  if (arranging && local) list = local.map((id) => cards.find((c) => c.id === id)!).filter(Boolean);

  async function star(c: Card) {
    const next = !starred(c);
    setStars((s) => ({ ...s, [c.id]: next }));
    await call(`/api/cards/${c.id}/star`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ starred: next }) });
    onChange();
  }
  function startArrange() {
    setSort("mine");
    setLocal(mine.map((c) => c.id));
    setArranging(true);
  }
  async function doneArrange() {
    if (local) await call("/api/cards/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: local }) });
    setArranging(false);
    setPicked(null);
    setLocal(null);
    onChange();
  }
  function tap(c: Card) {
    if (!arranging) return openCard(c);
    if (!picked) return setPicked(c.id);
    if (picked === c.id) return setPicked(null);
    // move the picked card to where the tapped one is
    setLocal((ids) => {
      const next = (ids ?? []).filter((id) => id !== picked);
      next.splice(next.indexOf(c.id) + ((ids ?? []).indexOf(picked) < (ids ?? []).indexOf(c.id) ? 1 : 0), 0, picked);
      return next;
    });
    setPicked(null);
  }

  if (!cards.length) return <p className="text-[14px] text-[var(--ink2)]">{t("Your cards will gather here.")}</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {!arranging &&
          SORTS.map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)} className={`rounded-full border px-3 py-1.5 text-[13px] ${sort === s.id ? "border-[var(--gold)] bg-[#efe9ff] font-semibold text-[#5b3fb0]" : "border-[var(--line)] bg-white text-[var(--ink2)]"}`}>
              {s.id === "starred" && <Star size={12} className="-mt-0.5 mr-1 inline" />}
              {t(s.label)}
            </button>
          ))}
        {arranging ? (
          <>
            <span className="text-[13.5px] text-[var(--ink2)]">{t(picked ? "Now tap where it should go." : "Tap a card to move it.")}</span>
            <button onClick={doneArrange} className="ml-auto rounded-xl bg-[var(--ink)] px-4 py-2 text-[13.5px] font-semibold text-white">{t("Done")}</button>
          </>
        ) : (
          <button onClick={startArrange} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px] text-[var(--ink2)]"><ArrowLeftRight size={13} /> {t("Arrange")}</button>
        )}
      </div>
      {sort === "starred" && !list.length && <p className="mt-4 text-[14px] text-[var(--ink2)]">{t("Tap the star on any card to keep your favourites here.")}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((c) => (
          <div key={c.id} className={`relative transition ${arranging ? "cursor-pointer" : ""} ${picked === c.id ? "-translate-y-1.5 rounded-2xl ring-4 ring-[var(--gold)]" : ""} ${arranging && picked && picked !== c.id ? "opacity-80" : ""}`}>
            <button onClick={() => tap(c)} className="block w-full text-left">
              <HoloCard art={c.art ?? `/api/photos/${c.photoId}`} fg={c.fg} finish={finishFor(c)} name={c.name} line={c.line} stars={c.rarity} label={`${pet.name} · ${c.style}`} idle={!arranging} />
            </button>
            {!arranging && (
              <button onClick={() => star(c)} className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow" aria-label={starred(c) ? "Unstar" : "Star"}>
                <Star size={15} className={starred(c) ? "fill-[#f5b82e] text-[#f5b82e]" : "text-[var(--ink3)]"} />
              </button>
            )}
            <div className="mt-1.5 px-1 text-[11.5px] text-[var(--ink3)]">{new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {c.style}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
