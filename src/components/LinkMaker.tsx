"use client";

import { useState } from "react";
import { call } from "@/lib/api";
import { SENSES } from "@/lib/memory";
import { packFor, type Pattern } from "@/lib/species";
import type { Pet, Share } from "@/lib/types";

const PLAY: Pattern[] = ["ball", "circles", "path", "wind"];

// Make a link for a sitter or a playdate, choosing which kinds of moment it shares.
export default function LinkMaker({ kind, pet, title, blurb, onMade }: { kind: Share["kind"]; pet: Pet; title: string; blurb: string; onMade: (s: Share) => void }) {
  const kinds = [...new Set(packFor(pet.species).quest.map((q) => q.pattern))];
  const [topics, setTopics] = useState<Pattern[]>(kind === "playdate" ? kinds.filter((k) => PLAY.includes(k)) : kinds.filter((k) => k !== "hearts"));
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  async function make() {
    setBusy(true);
    const r = await call<{ share: Share }>("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, petId: pet.id, topics, label }) });
    setBusy(false);
    if (r) {
      setLabel("");
      onMade(r.share);
    }
  }
  return (
    <section className="ws-card p-5">
      <div className="serif text-[22px] font-bold">{title}</div>
      <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink2)]">{blurb}</p>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-[.16em] text-[var(--ink3)]">Share these kinds of moment</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {kinds.map((k) => {
          const on = topics.includes(k);
          return (
            <button key={k} onClick={() => setTopics(on ? topics.filter((t) => t !== k) : [...topics, k])} className={`rounded-full px-3 py-1 text-[12.5px] ${on ? "bg-[#efe9ff] font-medium text-[#5b3fb0] ring-1 ring-[var(--gold)]" : "bg-[#eeebf8] text-[var(--ink3)]"}`}>
              {SENSES[k]}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={kind === "sitter" ? "Who is it for? e.g. Sam, Nov 10–14" : "A name for this invite (optional)"} className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--gold)]" />
        <button disabled={busy || !topics.length} onClick={make} className="rounded-xl bg-[var(--ink)] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-40">{busy ? "Making…" : "Make link"}</button>
      </div>
    </section>
  );
}
