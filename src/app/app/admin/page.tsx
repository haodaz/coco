"use client";

import { useEffect, useState } from "react";
import AdminAccounts from "@/components/AdminAccounts";
import Shell from "@/components/Shell";
import { CocoLoader } from "@/components/Loading";

type Row = { calls: number; tokens: number };
type Usage = { days: Record<string, Row>; features: Record<string, Row>; people: Record<string, Row>; paintingsToday: number; paintingCap: number; accounts: number };

// Old layered cards: give them a clean scene behind the pet, a few at a time.
function FixLayers() {
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/admin/plates").then((r) => r.json()).then((j) => setLeft(j.left ?? 0));
  }, []);
  if (!left) return null;
  async function run() {
    setBusy(true);
    let n = left ?? 0;
    while (n > 0) {
      const r = await fetch("/api/admin/plates", { method: "POST" }).then((x) => x.json());
      if (!r.fixed) break;
      n = r.left;
      setLeft(n);
    }
    setBusy(false);
    window.dispatchEvent(new Event("coco-refresh"));
  }
  return (
    <section className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1 text-[14px]"><b>{left} layered card{left === 1 ? "" : "s"}</b> need their layers redone: a clean scene behind the pet (one painting, only if missing) and a pet layer with only the pet and what it wears and holds.</div>
      <button disabled={busy} onClick={run} className="rounded-xl bg-[var(--ink)] px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-50">{busy ? "Painting…" : "Fix card layers"}</button>
    </section>
  );
}

// Admin: the site's model use today and this week, so the budget never surprises anyone.
function UsageView() {
  const [u, setU] = useState<Usage | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/admin/usage").then(async (r) => {
      const j = await r.json();
      if (r.ok) setU(j);
      else setErr(j.error ?? "could not load usage");
    });
  }, []);
  if (err) return <p className="text-[14px] text-[var(--sub)]">{err}</p>;
  if (!u) return <div className="py-16"><CocoLoader size="sm" label="Loading…" /></div>;
  const table = (title: string, data: Record<string, Row>) => (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-[15px] font-bold">{title}</h2>
      <table className="mt-2 w-full text-[13px]">
        <thead className="text-left text-[var(--sub)]"><tr><th className="py-1 font-medium"></th><th className="font-medium">calls</th><th className="font-medium">tokens</th></tr></thead>
        <tbody>
          {Object.entries(data).sort((a, b) => b[1].calls - a[1].calls).map(([k, v]) => (
            <tr key={k} className="border-t border-[var(--line)]"><td className="py-1.5 pr-3">{k}</td><td>{v.calls}</td><td>{v.tokens.toLocaleString()}</td></tr>
          ))}
          {!Object.keys(data).length && <tr><td className="py-2 text-[var(--sub)]">nothing yet</td></tr>}
        </tbody>
      </table>
    </section>
  );
  const pct = Math.min(100, Math.round((u.paintingsToday / u.paintingCap) * 100));
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-[14px]"><b>{u.paintingsToday}</b> of {u.paintingCap} paintings today (site-wide cap) · {u.accounts} accounts</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]"><div className={`h-full rounded-full ${pct > 80 ? "bg-[#ff4d4f]" : "bg-[var(--primary)]"}`} style={{ width: `${pct}%` }} /></div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        {table("Today, by feature", u.features)}
        {table("Today, by person", u.people)}
      </div>
      {table("Last 7 days", u.days)}
      <p className="text-[12px] text-[var(--sub)]">Token counts come from the Meta Model API&apos;s own usage fields; money is shown on the Meta billing page.</p>
    </div>
  );
}

function Admin() {
  const [tab, setTab] = useState<"usage" | "accounts">("accounts");
  return (
    <div>
      <div className="mb-5 flex gap-1">
        {(["accounts", "usage"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium capitalize ${tab === t ? "bg-white shadow-sm" : "text-[var(--sub)]"}`}>{t}</button>
        ))}
      </div>
      <FixLayers />
      {tab === "usage" ? <UsageView /> : <AdminAccounts />}
    </div>
  );
}

export default function AdminPage() {
  return <Shell>{() => <Admin />}</Shell>;
}
