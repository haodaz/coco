"use client";

import { useEffect, useState } from "react";
import { petArt } from "@/components/PetFace";
import type { Card, GraphEdge, GraphGroup, Pet, State } from "@/lib/types";
import { useT } from "@/lib/ui";

// What the AI knows about the pet, drawn as a small graph: the pet in the middle; around it, how it is (self),
// the things, beings and places it is related to, each link resting on real cards; and, outside, the general
// knowledge it may use but never takes for a memory (its breed, the place it lives). Tap a node to see the cards.

const GROUPS: Record<GraphGroup, { label: string; angle: number; color: string; bg: string }> = {
  self: { label: "How I am", angle: -90, color: "#5b3fb0", bg: "#efe9ff" },
  things: { label: "Things", angle: 0, color: "#b4560f", bg: "#fff1e3" },
  beings: { label: "People & animals", angle: 90, color: "#c2418f", bg: "#fde8f2" },
  places: { label: "Places", angle: 180, color: "#1f7a6d", bg: "#e3f6f1" },
};
const PER_GROUP = 6;

// one node per thing: the relations to the same object in a group are joined, their cards pooled
function merge(edges: GraphEdge[]): GraphEdge[] {
  const by = new Map<string, GraphEdge>();
  for (const e of edges) {
    const k = `${e.group}|${e.object}`;
    const m = by.get(k);
    if (!m) by.set(k, { ...e, cardIds: [...e.cardIds] });
    else {
      if (!m.relation.split(" · ").includes(e.relation)) m.relation = `${m.relation} · ${e.relation}`;
      m.cardIds = [...new Set([...m.cardIds, ...e.cardIds])];
      m.owner = m.owner || e.owner;
    }
  }
  return [...by.values()];
}

function layout(edges: GraphEdge[]) {
  const out: { e: GraphEdge; x: number; y: number }[] = [];
  for (const g of Object.keys(GROUPS) as GraphGroup[]) {
    const mine = edges.filter((e) => e.group === g).sort((a, b) => b.cardIds.length - a.cardIds.length).slice(0, PER_GROUP);
    mine.forEach((e, i) => {
      const spread = Math.min(72, 16 * mine.length); // degrees the group fans out over: wider when it has more
      const a = ((GROUPS[g].angle + (mine.length === 1 ? 0 : -spread / 2 + (spread * i) / (mine.length - 1))) * Math.PI) / 180;
      const far = i % 2 ? 1.08 : 0.7;
      out.push({ e, x: 50 + Math.cos(a) * 39 * far, y: 50 + Math.sin(a) * 39 * far });
    });
  }
  return out;
}

export default function MemoryGraph({ pet, state, openCard }: { pet: Pet; state: State; openCard?: (c: Card) => void }) {
  const { t } = useT();
  const [graph, setGraph] = useState(pet.graph ?? null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<GraphEdge | null>(null);
  const cardCount = state.cards.filter((c) => c.petId === pet.id && c.kind !== "legendary" && !c.versionOf).length;
  useEffect(() => {
    if (graph && graph.basis === cardCount) return;
    setBusy(true);
    fetch(`/api/pets/${pet.id}/graph`).then((r) => r.json()).then((j) => j.graph && setGraph(j.graph)).finally(() => setBusy(false));
  }, [pet.id, cardCount, graph]);

  const face = petArt(pet);
  const edges = graph ? merge(graph.edges) : [];
  const nodes = layout(edges);
  const general = [pet.breed && { label: pet.breed, kind: t("breed") }, state.place?.name && { label: state.place.name, kind: t("local rules") }].filter(Boolean) as { label: string; kind: string }[];
  const cards = picked ? picked.cardIds.map((id) => state.cards.find((c) => c.id === id)).filter((c): c is Card => !!c) : [];

  return (
    <section className="ws-card overflow-hidden p-5">
      <div className="relative mx-auto hidden aspect-[16/10] w-full max-w-4xl rounded-2xl sm:block bg-[radial-gradient(circle_at_50%_50%,#f6f2ff_0,#fbfaff_55%,#fff_100%)]">
        {/* the general layer: known about the kind of pet and the place, never taken for a memory */}
        <div className="absolute inset-[3%] rounded-[50%] border-2 border-dashed border-[#d9d3ee]" />
        {general.map((g, i) => (
          <div key={g.label} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#b9b2d6] bg-white px-3 py-1 text-[12px] text-[var(--ink2)]" style={{ left: `${i ? 86 : 14}%`, top: `${i ? 90 : 10}%` }}>
            {g.label} <span className="text-[10.5px] uppercase tracking-[.1em] text-[var(--ink3)]">· {g.kind}</span>
          </div>
        ))}
        {/* the links */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {nodes.map(({ e, x, y }) => (
            <line key={e.relation + e.object} x1="50" y1="50" x2={x} y2={y} stroke={GROUPS[e.group].color} strokeOpacity={picked && picked !== e ? 0.12 : 0.35} strokeWidth={0.25 + e.cardIds.length * 0.15} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {/* the group names */}
        {(Object.keys(GROUPS) as GraphGroup[]).map((g) => {
          const a = (GROUPS[g].angle * Math.PI) / 180;
          return (
            <div key={g} className="absolute -translate-x-1/2 -translate-y-1/2 text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ left: `${50 + Math.cos(a) * 15}%`, top: `${50 + Math.sin(a) * 19}%`, color: GROUPS[g].color }}>
              {t(GROUPS[g].label)}
            </div>
          );
        })}
        {/* the pet */}
        <div className="absolute left-1/2 top-1/2 grid aspect-square w-[11%] -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full bg-white shadow-[0_8px_24px_-10px_rgba(60,40,140,.5)] ring-4 ring-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {face ? <img src={face} alt={pet.name} className="h-[170%] w-[170%] max-w-none object-cover object-top" /> : <span className="serif font-bold">{pet.name}</span>}
        </div>
        {/* what it is related to */}
        {nodes.map(({ e, x, y }) => {
          const g = GROUPS[e.group];
          const on = picked === e;
          return (
            <button
              key={e.relation + e.object}
              onClick={() => setPicked(on ? null : e)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium shadow-sm transition ${on ? "scale-110 ring-2" : "hover:scale-105"}`}
              style={{ left: `${x}%`, top: `${y}%`, background: g.bg, color: g.color, ["--tw-ring-color" as string]: g.color }}
              title={`${pet.name} ${e.relation} ${e.object}`}
            >
              {e.object}
              {e.owner && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#e0a72e] align-middle" title={t("your words")} />}
            </button>
          );
        })}
        {busy && !graph && <div className="absolute inset-0 grid place-items-center text-[13px] text-[var(--ink2)]">{t("Drawing what I know…")}</div>}
      </div>

      {/* on a phone: the same graph as groups around the pet */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-[#ebe5fb]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {face && <img src={face} alt={pet.name} className="h-[170%] w-[170%] max-w-none object-cover object-top" />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {general.map((g) => <span key={g.label} className="rounded-full border border-dashed border-[#b9b2d6] px-2.5 py-0.5 text-[11.5px] text-[var(--ink2)]">{g.label} · {g.kind}</span>)}
          </div>
        </div>
        {(Object.keys(GROUPS) as GraphGroup[]).map((g) => {
          const mine = edges.filter((e) => e.group === g);
          if (!mine.length) return null;
          return (
            <div key={g} className="mt-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[.16em]" style={{ color: GROUPS[g].color }}>{t(GROUPS[g].label)}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {mine.map((e) => (
                  <button key={e.relation + e.object} onClick={() => setPicked(picked === e ? null : e)} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${picked === e ? "ring-2" : ""}`} style={{ background: GROUPS[g].bg, color: GROUPS[g].color, ["--tw-ring-color" as string]: GROUPS[g].color }}>
                    {e.relation} {e.object}
                    {e.owner && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#e0a72e] align-middle" />}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {busy && !graph && <p className="mt-3 text-[13px] text-[var(--ink2)]">{t("Drawing what I know…")}</p>}
      </div>

      <div className="mt-4 min-h-[64px] text-center">
        {picked ? (
          <div>
            <div className="text-[14px]">
              <b>{pet.name}</b> {picked.relation} <b>{picked.object}</b>
              {picked.owner && <span className="ml-2 rounded-full bg-[#fff4d9] px-2 py-0.5 text-[11px] font-semibold text-[#9a6b00]">{t("your words")}</span>}
            </div>
            <div className="mt-2 flex justify-center gap-2">
              {cards.map((c) => (
                <button key={c.id} onClick={() => openCard?.(c)} title={c.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.art ?? `/api/photos/${c.photoId}`} alt={c.name} className="h-16 w-12 rounded-md object-cover ring-1 ring-[var(--line)] transition hover:-translate-y-0.5" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--ink2)]">
            {t("Every link rests on real cards. Tap one to see them. Dashed: general knowledge I may use, never a memory.")}
            {graph?.by === "open" && <span className="mt-1 block text-[11px] text-[var(--ink3)]">{t("Drawn by Muse Spark Open (open weights).")}</span>}
          </p>
        )}
      </div>
    </section>
  );
}
