"use client";

import { CloudSun, ExternalLink, Gavel, House, MapPin, Search, ShieldCheck, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { call } from "@/lib/api";
import { SERVICE_LABEL, type Area, type Place, type ServiceKind } from "@/lib/place";
import type { Fact, PlaceFacts } from "@/lib/rules";

const ICON = { weather: CloudSun, check: ShieldCheck, rule: Gavel, home: House, services: Store } as const;
const LEVEL = {
  ok: "bg-[#e9f7ef] text-[#1f7a46]",
  careful: "bg-[#fff4e0] text-[#9a5b00]",
  no: "bg-[#fde8ec] text-[#b4234a]",
} as const;
const LEVEL_WORD = { ok: "Fine", careful: "Careful", no: "No" } as const;

export const when = (at: string) => {
  const d = new Date(at);
  if (Number.isNaN(+d)) return at;
  const mins = (Date.now() - +d) / 60_000;
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

// One fact about the place: what it says, where it comes from, when it was checked.
export function FactCard({ fact }: { fact: Fact }) {
  const Icon = ICON[fact.kind];
  return (
    <div className="ws-card p-3.5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="shrink-0 text-[var(--gold)]" />
        <b className="text-[14px]">{fact.title}</b>
        {fact.level && <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL[fact.level]}`}>{LEVEL_WORD[fact.level]}</span>}
      </div>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--ink)]">{fact.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[11.5px] text-[var(--ink3)]">
        {fact.url ? (
          <a href={fact.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--gold)]">{fact.source} <ExternalLink size={11} /></a>
        ) : (
          <span>{fact.source}</span>
        )}
        <span>· checked {when(fact.at)}</span>
      </div>
    </div>
  );
}

// Pick a town: type, choose from real places. Only the town's centre is kept.
export function AreaPicker({ onPicked, current }: { onPicked: () => void; current?: string | null }) {
  const [q, setQ] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) return setAreas([]);
    const t = setTimeout(async () => {
      const r = await call<{ areas: Area[] }>(`/api/place/search?q=${encodeURIComponent(q.trim())}`);
      setAreas(r?.areas ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  async function pick(i: number) {
    setBusy(true);
    const r = await call("/api/place", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area: q.trim(), pick: i }) });
    setBusy(false);
    if (r) {
      setQ("");
      setAreas([]);
      onPicked();
    }
  }
  return (
    <div>
      <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 focus-within:border-[var(--gold)]">
        <Search size={15} className="text-[var(--ink3)]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={current ? "Moved? Type your town" : "Your town or neighbourhood"} className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none" />
      </label>
      {areas.length > 0 && (
        <div className="mt-2 grid gap-1">
          {areas.map((a, i) => (
            <button key={`${a.lat},${a.lon}`} disabled={busy} onClick={() => pick(i)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] hover:bg-[#f1edfb] disabled:opacity-50">
              <MapPin size={14} className="shrink-0 text-[var(--gold)]" /> {a.area}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[12px] text-[var(--ink3)]">We keep the town, never your street address.</p>
    </div>
  );
}

const HOME_TYPES: { v: NonNullable<Place["home"]["type"]>; label: string }[] = [
  { v: "apartment", label: "Apartment" },
  { v: "house", label: "House" },
  { v: "other", label: "Something else" },
];

export function HomeForm({ place, onSaved }: { place: Place; onSaved: () => void }) {
  const [rules, setRules] = useState(place.home.rules ?? "");
  const save = async (home: Partial<Place["home"]>) => {
    if (await call("/api/place", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ home }) })) onSaved();
  };
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-[13px] ${on ? "border-[var(--gold)] bg-[#efe9ff] text-[#5b3fb0]" : "border-[var(--line)] bg-white text-[var(--ink2)] hover:border-[var(--gold)]"}`;
  return (
    <div className="ws-card grid gap-4 p-4">
      <div>
        <div className="text-[12px] font-bold uppercase tracking-[.14em] text-[var(--ink3)]">Home</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {HOME_TYPES.map((t) => <button key={t.v} onClick={() => save({ type: place.home.type === t.v ? null : t.v })} className={chip(place.home.type === t.v)}>{t.label}</button>)}
        </div>
      </div>
      <div>
        <div className="text-[12px] font-bold uppercase tracking-[.14em] text-[var(--ink3)]">Yard</div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => save({ yard: place.home.yard === true ? null : true })} className={chip(place.home.yard === true)}>We have one</button>
          <button onClick={() => save({ yard: place.home.yard === false ? null : false })} className={chip(place.home.yard === false)}>No yard</button>
        </div>
      </div>
      <div>
        <div className="text-[12px] font-bold uppercase tracking-[.14em] text-[var(--ink3)]">Building or lease rules about pets</div>
        <textarea value={rules} onChange={(e) => setRules(e.target.value)} onBlur={() => rules !== (place.home.rules ?? "") && save({ rules })} rows={2} maxLength={300} placeholder="For example: leash in the lobby, no pets on the roof deck" className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-[14px] outline-none focus:border-[var(--gold)]" />
      </div>
    </div>
  );
}

export function Services({ place, onChanged }: { place: Place; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const items = place.services?.items ?? [];
  const kinds = Object.keys(SERVICE_LABEL) as ServiceKind[];
  async function look() {
    setBusy(true);
    const r = await call("/api/place/services", { method: "POST" });
    setBusy(false);
    if (r) onChanged();
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-[14px] text-[var(--ink2)]">
          {place.services ? `${items.length} pet places within 5 km of ${place.name}, checked ${when(place.services.checkedAt)}.` : `Look up dog parks, groomers, boarding, pet shops and clinics around ${place.name}.`}
        </p>
        <button disabled={busy} onClick={look} className="rounded-xl bg-[var(--ink)] px-4 py-2 text-[13.5px] font-semibold text-white disabled:opacity-50">{busy ? "Looking around…" : place.services ? "Look again" : "Look around"}</button>
      </div>
      {items.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kinds.map((k) => {
            const list = items.filter((s) => s.kind === k);
            if (!list.length) return null;
            return (
              <div key={k} className="ws-card p-3.5">
                <b className="text-[14px]">{SERVICE_LABEL[k]}</b> <span className="text-[12px] text-[var(--ink3)]">· {list.length}</span>
                <ul className="mt-2 grid gap-1.5">
                  {list.slice(0, 5).map((s) => (
                    <li key={s.osm} className="text-[13px] leading-snug">
                      <a href={s.osm} target="_blank" rel="noreferrer" className="hover:text-[var(--gold)]">{s.name}</a>
                      {s.hours && <span className="block truncate text-[11.5px] text-[var(--ink3)]">{s.hours}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {place.services && <p className="mt-3 text-[11.5px] text-[var(--ink3)]">Listings from © OpenStreetMap contributors, not recommendations. Clinics are listed by name only; coco never gives medical advice.</p>}
    </div>
  );
}

export function usePlace() {
  const [data, setData] = useState<PlaceFacts | null>(null);
  const load = async () => setData(await call<PlaceFacts>("/api/place"));
  useEffect(() => {
    load();
  }, []);
  return { data, reload: load };
}
