"use client";

import { Check, Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";
import { call } from "@/lib/api";
import type { Pet, Share } from "@/lib/types";
import { useT } from "@/lib/ui";

// A public link to pass around: one card, or the pet's whole universe. Made on first tap, then copied, shared with
// the phone's own share sheet, or saved as a picture (the same one social apps show for the link).
export default function ShareBox({ pet, kind, cardId, label, onMade }: { pet: Pet; kind: "card" | "pet"; cardId?: string; label: string; onMade?: () => void }) {
  const { t } = useT();
  const [share, setShare] = useState<Share | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = share ? `${location.origin}/${kind === "card" ? "c" : "w"}/${share.token}` : "";
  const text = kind === "card" ? t("This is {name}'s memory card. In cocoverse we keep every moment.", { name: pet.name }) : t("This is {name}. In cocoverse we have a universe of our own.", { name: pet.name });

  async function make() {
    setBusy(true);
    const r = await call<{ share: Share }>("/api/shares", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, petId: pet.id, cardId }) });
    setBusy(false);
    if (r) {
      setShare(r.share);
      onMade?.();
    }
  }
  async function copy() {
    await navigator.clipboard.writeText(`${text} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function native() {
    try {
      await navigator.share({ title: `${pet.name} · cocoverse`, text, url });
    } catch {}
  }

  if (!share)
    return (
      <button disabled={busy} onClick={make} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3.5 py-2 text-[13.5px] font-semibold hover:border-[var(--gold)] disabled:opacity-50">
        <Share2 size={15} /> {busy ? t("Making…") : label}
      </button>
    );
  const canNative = typeof navigator !== "undefined" && !!navigator.share;
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3">
      <div className="text-[12.5px] text-[var(--ink2)]">{text}</div>
      <div className="mt-1.5 truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-[12px] text-[var(--ink)]">{url}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={copy} className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink)] px-3 py-1.5 text-[12.5px] font-semibold text-white">{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("Copied") : t("Copy")}</button>
        {canNative && <button onClick={native} className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold"><Share2 size={13} /> {t("Share…")}</button>}
        <a href={`${url}/opengraph-image`} download={`${pet.name}-cocoverse.png`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-[12.5px] font-semibold"><Download size={13} /> {t("Save picture")}</a>
      </div>
    </div>
  );
}
