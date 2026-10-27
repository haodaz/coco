"use client";

import { Copy, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import PlaydateView from "@/components/PlaydateView";
import Shell, { PageHead, Rule } from "@/components/Shell";
import { call } from "@/lib/api";
import { SENSES } from "@/lib/memory";
import { packFor, type Pattern } from "@/lib/species";
import type { Pet, Share, State } from "@/lib/types";

const PLAY: Pattern[] = ["ball", "circles", "path", "wind"];

// Friends: hand your pet's twin to someone who will look after it, or invite another pet's twin to meet first.
export default function FriendsPage() {
  return (
    <Shell>
      {({ pet, state, refresh, openCard }) => {
        const shares = (state.shares ?? []).filter((s) => s.petId === pet.id && !s.revokedAt);
        const playdates = (state.playdates ?? []).filter((p) => p.petId === pet.id).sort((a, b) => b.at.localeCompare(a.at));
        const face = pet.character?.moods.idle?.[0] ? `/api/art/${pet.character.moods.idle[0]}?v=${encodeURIComponent(pet.character.at)}` : null;
        return (
          <>
            <PageHead
              eyebrow="Friends"
              art="signin"
              title={`Introduce ${pet.name}`}
              sub="Built from your past together, here for what comes next"
              lead={`Before someone looks after ${pet.name}, they can talk with ${pet.name}'s twin. Before ${pet.name} meets a new friend, the two twins can meet first. You choose which kinds of moment each link shares, and you can switch a link off any time.`}
            />
            <div className="grid gap-5 lg:grid-cols-2">
              <LinkMaker kind="sitter" pet={pet} onMade={refresh} title="For a sitter" blurb={`A link to ${pet.name}'s twin for whoever looks after ${pet.name}: routines, favourite spots, how ${pet.name} reacts to things. No sign-in needed. Food amounts, medicine and house rules always go back to you.`} />
              <LinkMaker kind="playdate" pet={pet} onMade={refresh} title="Find a playmate" blurb={`Send an invite to another pet's owner. When they open it with their pet, the two twins talk first and leave you both an honest note on whether they'd get on.`} />
            </div>

            <Rule label="Your links" />
            {shares.length ? (
              <div className="space-y-2">
                {shares.map((s) => <LinkRow key={s.token} s={s} pet={pet} state={state} onChange={refresh} />)}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--ink2)]">No links yet.</p>
            )}

            <Rule label="Playdates" />
            {playdates.length ? (
              <div className="space-y-8">
                {playdates.map((p) => (
                  <div key={p.id}>
                    <div className="mb-3 text-[14px] text-[var(--ink2)]">
                      <b className="serif text-[18px] text-[var(--ink)]">{pet.name} & {p.other.name}</b> · {p.other.breed ?? p.other.species} · {new Date(p.at).toLocaleDateString()}
                    </div>
                    <PlaydateView p={p} petName={pet.name} myFace={face} otherFace={p.other.face ? `/api/art/${p.other.face}` : null} cards={state.cards} openCard={openCard} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--ink2)]">When another pet&apos;s owner opens your invite, the twins&apos; conversation and note appear here.</p>
            )}
          </>
        );
      }}
    </Shell>
  );
}

function LinkMaker({ kind, pet, title, blurb, onMade }: { kind: Share["kind"]; pet: Pet; title: string; blurb: string; onMade: () => void }) {
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
      onMade();
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
            <button key={k} onClick={() => setTopics(on ? topics.filter((t) => t !== k) : [...topics, k])} className={`rounded-full px-3 py-1 text-[12.5px] ${on ? "bg-[#fff1d6] font-medium text-[#7a5618] ring-1 ring-[var(--gold)]" : "bg-[#f1ebe0] text-[var(--ink3)]"}`}>
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

function LinkRow({ s, pet, state, onChange }: { s: Share; pet: Pet; state: State; onChange: () => void }) {
  const url = typeof window === "undefined" ? "" : `${location.origin}/${s.kind === "sitter" ? "s" : "p"}/${s.token}`;
  const asked = (state.threads ?? []).filter((t) => t.via?.token === s.token).reduce((n, t) => n + t.turns.length, 0);
  const [copied, setCopied] = useState(false);
  return (
    <div className="ws-card flex flex-wrap items-center gap-3 px-4 py-3">
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[.1em] ${s.kind === "sitter" ? "bg-[#e9f2e1] text-[#3f6b1f]" : "bg-[#efe6fb] text-[#5b3fb0]"}`}>{s.kind === "sitter" ? "Sitter" : "Playdate"}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{s.label}</div>
        <div className="truncate text-[12px] text-[var(--ink3)]">{s.topics.map((t) => SENSES[t]).join(" · ")}{s.kind === "sitter" ? ` · ${asked} question${asked === 1 ? "" : "s"} asked` : ""}</div>
      </div>
      <button onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ink2)] hover:bg-[rgba(35,32,27,.05)]"><Copy size={14} />{copied ? "Copied" : "Copy link"}</button>
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ink2)] hover:bg-[rgba(35,32,27,.05)]"><ExternalLink size={14} />Open</a>
      <button onClick={async () => { if (confirm(`Switch off this link? ${pet.name}'s twin will stop answering on it.`)) { await call("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", token: s.token }) }); onChange(); } }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-[#cf1322] hover:bg-[#fff1f0]"><X size={14} />Switch off</button>
    </div>
  );
}
