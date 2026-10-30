"use client";

import type { Card, Playdate } from "@/lib/types";
import { useT } from "@/lib/ui";

const VERDICT: Record<string, string> = { "good match": "A good match", "worth a try": "Worth a try", "not yet": "Not yet", "not enough to tell": "Not enough to tell yet" };

// Two twins' meeting, from this owner's side: what they said to each other, and the honest note that followed.
export default function PlaydateView({ p, petName, myFace, otherFace, cards = [], openCard }: { p: Playdate; petName: string; myFace: string | null; otherFace: string | null; cards?: Card[]; openCard?: (c: Card) => void }) {
  const { t: tr } = useT();
  const face = (src: string | null) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-full w-[170%] max-w-none -translate-x-[20%] object-cover object-top" />
    ) : null;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-3">
        {p.transcript.map((t, i) => (
          <div key={i} className={`flex items-end gap-2 ${t.who === "me" ? "" : "flex-row-reverse"}`}>
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#ebe5fb] ring-2 ring-white">{face(t.who === "me" ? myFace : otherFace)}</span>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${t.who === "me" ? "rounded-bl-md border border-[var(--line)] bg-white" : "rounded-br-md bg-[#ebe5fb]"}`}>
              <div className="text-[11px] font-bold text-[var(--ink3)]">{t.who === "me" ? petName : p.other.name}</div>
              {t.line}
            </div>
          </div>
        ))}
      </div>
      <div className="ws-card p-5">
        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{tr("The twins' note")}</div>
        <div className="serif mt-1 text-[24px] font-bold">{VERDICT[p.report.verdict] ? tr(VERDICT[p.report.verdict]) : p.report.verdict}</div>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink2)]">{p.report.summary}</p>
        {p.report.reasons.length > 0 && (
          <ul className="mt-3 space-y-2 text-[13.5px]">
            {p.report.reasons.map((r, i) => (
              <li key={i}>
                <b>{r.pet === "me" ? petName : p.other.name}:</b> {r.text}
                {r.pet === "me" && r.cardIds.length > 0 && (
                  <span className="ml-1 inline-flex gap-1 align-middle">
                    {r.cardIds.map((id) => {
                      const c = cards.find((x) => x.id === id);
                      return c ? (
                        <button key={id} onClick={() => openCard?.(c)} title={c.name}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.art ?? `/api/photos/${c.photoId}`} alt={c.name} className="h-8 w-6 rounded object-cover ring-1 ring-[var(--line)]" />
                        </button>
                      ) : null;
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {p.report.cautions.length > 0 && <div className="mt-3 rounded-xl bg-[#f3eefe] px-3 py-2 text-[13px] text-[#5b3fb0]"><b>{tr("Watch for:")}</b> {p.report.cautions.join(" ")}</div>}
        {p.report.firstMeeting.length > 0 && (
          <div className="mt-3 text-[12.5px] text-[var(--ink2)]">
            <b>{tr("For a first meeting (general advice):")}</b> {p.report.firstMeeting.join(" ")}
          </div>
        )}
        <p className="mt-3 text-[11.5px] text-[var(--ink3)]">{tr("Advice from the twins, not a promise. You decide in person.")}{p.openWeights ? ` · ${tr("The twins talked on Muse Spark Open (open weights).")}` : ""}</p>
      </div>
    </div>
  );
}
