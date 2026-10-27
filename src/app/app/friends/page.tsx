"use client";

import { Copy, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import LinkMaker from "@/components/LinkMaker";
import PlaydateView from "@/components/PlaydateView";
import Shell, { PageHead, Rule } from "@/components/Shell";
import { call } from "@/lib/api";
import { SENSES } from "@/lib/memory";
import { packFor, type Pattern } from "@/lib/species";
import type { Pet, Share, State } from "@/lib/types";
import { tIn, useT } from "@/lib/ui";

const PLAY: Pattern[] = ["ball", "circles", "path", "wind"];

// Friends: hand your pet's twin to someone who will look after it, or invite another pet's twin to meet first.
export default function FriendsPage() {
  return (
    <Shell>
      {({ pet, state, refresh, openCard, t }) => {
        const shares = (state.shares ?? []).filter((s) => s.petId === pet.id && !s.revokedAt);
        const playdates = (state.playdates ?? []).filter((p) => p.petId === pet.id).sort((a, b) => b.at.localeCompare(a.at));
        const face = pet.character?.moods.idle?.[0] ? `/api/art/${pet.character.moods.idle[0]}?v=${encodeURIComponent(pet.character.at)}` : null;
        return (
          <>
            <PageHead
              eyebrow={t("Friends")}
              art="signin"
              title={t("Introduce {name}", { name: pet.name })}
              sub={t("Built from your past together, here for what comes next")}
              lead={t("Before someone looks after {name}, they can talk with {name}'s twin. Before {name} meets a new friend, the two twins can meet first. You choose which kinds of moment each link shares, and you can switch a link off any time.", { name: pet.name })}
            />
            <div className="grid gap-5 lg:grid-cols-2">
              <LinkMaker kind="sitter" pet={pet} onMade={refresh} title={t("For a sitter")} blurb={t("A link to {name}'s twin for whoever looks after {name}: routines, favourite spots, how {name} reacts to things. No sign-in needed. Food amounts, medicine and house rules always go back to you.", { name: pet.name })} />
              <LinkMaker kind="playdate" pet={pet} onMade={refresh} title={t("Find a playmate")} blurb={t("Send an invite to another pet's owner. When they open it with their pet, the two twins talk first and leave you both an honest note on whether they'd get on.")} />
            </div>

            <Rule label={t("Your links")} />
            {shares.length ? (
              <div className="space-y-2">
                {shares.map((s) => <LinkRow key={s.token} s={s} pet={pet} state={state} onChange={refresh} />)}
              </div>
            ) : (
              <p className="text-[14px] text-[var(--ink2)]">{t("No links yet.")}</p>
            )}

            <Rule label={t("Playdates")} />
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
              <p className="text-[14px] text-[var(--ink2)]">{t("When another pet's owner opens your invite, the twins' conversation and note appear here.")}</p>
            )}
          </>
        );
      }}
    </Shell>
  );
}

function LinkRow({ s, pet, state, onChange }: { s: Share; pet: Pet; state: State; onChange: () => void }) {
  const { t: tr } = useT();
  const url = typeof window === "undefined" ? "" : `${location.origin}/${s.kind === "sitter" ? "s" : "p"}/${s.token}`;
  const asked = (state.threads ?? []).filter((t) => t.via?.token === s.token).reduce((n, t) => n + t.turns.length, 0);
  const [copied, setCopied] = useState(false);
  return (
    <div className="ws-card flex flex-wrap items-center gap-3 px-4 py-3">
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[.1em] ${s.kind === "sitter" ? "bg-[#e9f2e1] text-[#3f6b1f]" : "bg-[#efe6fb] text-[#5b3fb0]"}`}>{s.kind === "sitter" ? tr("Sitter") : tr("Playdate")}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{s.label}</div>
        <div className="truncate text-[12px] text-[var(--ink3)]">{s.topics.map((t) => tIn(tr, SENSES[t], "kind of moment")).join(" · ")}{s.kind === "sitter" ? ` · ${tr(asked === 1 ? "{n} question asked" : "{n} questions asked", { n: asked })}` : ""}</div>
      </div>
      <button onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ink2)] hover:bg-[rgba(35,32,27,.05)]"><Copy size={14} />{copied ? tr("Copied") : tr("Copy link")}</button>
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ink2)] hover:bg-[rgba(35,32,27,.05)]"><ExternalLink size={14} />{tr("Open")}</a>
      <button onClick={async () => { if (confirm(tr("Switch off this link? {name}'s twin will stop answering on it.", { name: pet.name }))) { await call("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", token: s.token }) }); onChange(); } }} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-[#cf1322] hover:bg-[#fff1f0]"><X size={14} />{tr("Switch off")}</button>
    </div>
  );
}
