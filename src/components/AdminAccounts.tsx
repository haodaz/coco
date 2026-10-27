"use client";

import { useEffect, useState } from "react";

type Account = { id: string; email: string | null; createdAt: string; lastSignIn: string | null; banned: boolean; pets: { id: string; name: string; species: string; breed: string | null }[]; cards: number; photos: number; notes: number; updatedAt: string | null };
type Detail = {
  account: { id: string; email: string; createdAt: string; lastSignIn: string | null; banned: boolean };
  pets: { id: string; name: string; species: string; breed: string | null; born: string | null; sex: string | null; avatar: string | null }[];
  cards: { id: string; kind: string; name: string; line: string; observation: string; note: string | null; art: string | null; photo: string | null; facesBlurred: number; createdAt: string }[];
};

const date = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");

// Admins: every account and what it has shared, so anything that doesn't belong on the site can be taken down.
export default function AdminAccounts() {
  const [list, setList] = useState<Account[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const reload = () =>
    fetch("/api/admin/users").then(async (r) => {
      const j = await r.json();
      if (r.ok) setList(j.accounts);
      else setErr(j.error);
    });
  useEffect(() => {
    reload();
  }, []);
  if (err) return <p className="text-[14px] text-[var(--sub)]">{err}</p>;
  if (!list) return <p className="text-[14px] text-[var(--sub)]">Loading…</p>;
  if (open) return <AccountView id={open} back={() => { setOpen(null); reload(); }} />;
  return (
    <section className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead className="text-left text-[var(--sub)]">
          <tr><th className="py-1 font-medium">Account</th><th className="font-medium">Pets</th><th className="font-medium">Cards</th><th className="font-medium">Photos</th><th className="font-medium">Notes</th><th className="font-medium">Last active</th><th></th></tr>
        </thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id} className="border-t border-[var(--line)]">
              <td className="py-2 pr-3">{a.email ?? a.id}{a.banned && <span className="ml-2 rounded bg-[#fff1f0] px-1.5 py-0.5 text-[11px] text-[#cf1322]">suspended</span>}</td>
              <td>{a.pets.map((p) => `${p.name || "(unnamed)"} · ${p.species}`).join(", ") || "—"}</td>
              <td>{a.cards}</td><td>{a.photos}</td><td>{a.notes}</td>
              <td className="text-[var(--sub)]">{date(a.updatedAt ?? a.lastSignIn)}</td>
              <td><button onClick={() => setOpen(a.id)} className="text-[var(--primary)]">Review</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AccountView({ id, back }: { id: string; back: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [busy, setBusy] = useState("");
  const load = () => fetch(`/api/admin/users/${id}`).then((r) => r.json()).then(setD);
  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function act(body: object, confirmText: string, key: string) {
    if (!confirm(confirmText)) return;
    setBusy(key);
    const r = await fetch(`/api/admin/users/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy("");
    if (!r.ok) alert((await r.json()).error);
    load();
  }
  if (!d) return <p className="text-[14px] text-[var(--sub)]">Loading…</p>;
  const a = d.account;
  return (
    <div className="space-y-5">
      <button onClick={back} className="text-[13px] text-[var(--primary)]">← All accounts</button>
      <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <div className="text-[16px] font-bold">{a.email}</div>
          <div className="text-[12.5px] text-[var(--sub)]">Joined {date(a.createdAt)} · last sign-in {date(a.lastSignIn)}</div>
        </div>
        <button
          disabled={!!busy}
          onClick={() => act({ action: "add-moods" }, "Draw the moves this account's pets have unlocked but are missing? About a minute.", "moods")}
          className="ml-auto rounded-lg bg-[#efe9ff] px-3 py-1.5 text-[13px] font-semibold text-[#5b3fb0]"
        >
          {busy === "moods" ? "Drawing…" : "Update character"}
        </button>
        <button
          disabled={!!busy}
          onClick={() => act({ action: a.banned ? "restore" : "suspend" }, a.banned ? `Restore ${a.email}? They can sign in again.` : `Suspend ${a.email}? They won't be able to sign in until restored. Their data stays.`, "account")}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold ${a.banned ? "bg-[#efe9ff] text-[var(--primary)]" : "bg-[#fff1f0] text-[#cf1322]"}`}
        >
          {a.banned ? "Restore account" : "Suspend account"}
        </button>
      </section>
      {d.pets.map((p) => (
        <section key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.avatar && <img src={p.avatar} alt="" className="h-14 w-14 rounded-xl object-cover" />}
          <div className="text-[13.5px]"><b>{p.name || "(unnamed)"}</b> · {p.species}{p.breed ? ` · ${p.breed}` : ""}{p.sex ? ` · ${p.sex}` : ""}{p.born ? ` · born ${p.born}` : ""}</div>
        </section>
      ))}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {d.cards.map((c) => (
          <article key={c.id} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.photo ? <img src={c.photo} alt="photo" className="aspect-[3/4] w-full rounded-lg object-cover" /> : <div className="aspect-[3/4] rounded-lg bg-[#eef1f7]" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.art ? <img src={c.art} alt="card" className="aspect-[3/4] w-full rounded-lg object-cover" /> : <div className="aspect-[3/4] rounded-lg bg-[#eef1f7]" />}
            </div>
            <div className="mt-2 text-[13px] font-semibold">{c.name} <span className="font-normal text-[var(--sub)]">· {c.kind}{c.facesBlurred ? ` · ${c.facesBlurred} face(s) blurred` : ""}</span></div>
            <p className="mt-1 text-[12.5px] italic text-[#3d4460]">“{c.line}”</p>
            {c.note && <p className="mt-1 text-[12.5px] text-[#3d4460]"><b>Owner:</b> {c.note}</p>}
            <div className="mt-2 flex items-center text-[11.5px] text-[var(--sub)]">
              {date(c.createdAt)}
              <button disabled={!!busy} onClick={() => act({ action: "remove-card", cardId: c.id }, `Take down “${c.name}”? The card, its photo (unless used elsewhere) and what was learned from it are deleted.`, c.id)} className="ml-auto text-[#cf1322]">
                {busy === c.id ? "Removing…" : "Take down"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
