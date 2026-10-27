"use client";

import { use, useEffect, useRef, useState } from "react";
import Character, { type Mood } from "@/components/Character";
import { PageLoading } from "@/components/Loading";
import { CocoLogo } from "@/components/Brand";

type Info = { pet: { name: string; species: string; breed: string | null; sex: string | null }; label: string; topics: string[]; moods: Record<string, string[]>; cards: { id: string; name: string; line: string; art: string | null }[] };
type Turn = { question: string; answer: string; mood: Mood; cards: { id: string; name: string; art: string | null }[]; basis: { cardId: string; how: string }[]; gap: { topic: string } | null };

// For someone looking after the pet (no sign-in): its twin, limited to what the owner shared.
export default function SitterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch(`/api/s/${token}`).then(async (r) => (r.ok ? setInfo(await r.json()) : setErr((await r.json()).error)));
  }, [token]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  async function ask(text: string) {
    if (!text.trim() || pending) return;
    setQ("");
    setPending(text);
    const fd = new FormData();
    fd.append("question", text.trim());
    const r = await fetch(`/api/s/${token}/ask`, { method: "POST", body: fd });
    const j = await r.json();
    setPending(null);
    if (!r.ok) return alert(j.error);
    setTurns((t) => [...t, j]);
  }

  if (err) return <main className="ws grid place-items-center p-8 text-center"><div><div className="serif text-[28px] font-bold">This link is switched off.</div><p className="mt-2 text-[var(--ink2)]">Ask the pet&apos;s owner for a new one.</p></div></main>;
  if (!info) return <PageLoading label="" />;
  const p = info.pet;
  const her = p.sex === "male" ? "his" : p.sex === "female" ? "her" : "their";
  const mood: Mood = pending ? "thinking" : turns[turns.length - 1]?.mood ?? "idle";
  const suggestions = [`Where do you like to sleep, ${p.name}?`, "What do you love to do on walks?", "How are you with other dogs?", "What should I know about car rides?"];

  const talking = turns.length > 0 || !!pending;
  return (
    <main className="ws block">
      <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col px-5">
        <header className="flex items-center gap-3 py-4">
          <CocoLogo size={20} />
          <span className="text-[12.5px] text-[var(--ink3)]">{info.label}</span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!talking ? (
            <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
              <div className="relative aspect-[3/4] w-[200px]">{info.moods.idle?.length ? <Character moods={info.moods} mood="idle" className="h-full w-full" /> : null}</div>
              <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">Looking after {p.name}</div>
              <h1 className="serif mt-1 text-[34px] font-bold leading-tight">Hi, I&apos;m {p.name}.</h1>
              <p className="serif mt-1 text-[18px] italic text-[var(--ink2)]">My person asked you to look after me. Ask me anything.</p>
              <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-[var(--ink2)]">I answer only from moments my person shared with me: {info.topics.join(", ").toLowerCase()}. For food amounts, medicine or house rules, please ask my person directly.</p>
              {info.cards.length > 0 && (
                <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-2">
                  {info.cards.slice(0, 10).map((c) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={c.id} src={c.art ?? ""} alt={c.name} title={c.name} className="h-24 w-[68px] shrink-0 rounded-lg object-cover ring-1 ring-[var(--line)]" />
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestions.map((sg) => <button key={sg} onClick={() => ask(sg)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px] text-[var(--ink2)] hover:border-[var(--gold)]">{sg}</button>)}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-24 pt-2">
              {turns.map((t, i) => (
                <div key={i}>
                  <div className="text-right"><span className="inline-block max-w-[85%] rounded-2xl rounded-br-md bg-[#ebe5fb] px-4 py-2 text-left text-[14.5px]">{t.question}</span></div>
                  <div className="mt-2 max-w-[92%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-white px-4 py-3 text-[16px] leading-relaxed">
                    {t.answer}
                    {t.cards.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-2.5">
                        {t.cards.map((c, k) => (
                          <span key={c.id} className="flex items-center gap-2 rounded-xl bg-[var(--paper)] p-1.5 pr-3 text-[12px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {c.art && <img src={c.art} alt="" className="h-10 w-7 rounded object-cover" />}
                            <span><b className="block">{c.name}</b><span className="text-[var(--ink2)]">{t.basis[k]?.how}</span></span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {pending && (
                <div>
                  <div className="text-right"><span className="inline-block rounded-2xl rounded-br-md bg-[#ebe5fb] px-4 py-2 text-[14.5px]">{pending}</span></div>
                  <div className="mt-2 inline-block animate-pulse rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-[var(--ink3)]">…</div>
                </div>
              )}
              <div ref={end} />
            </div>
          )}
        </div>
        <div className="relative pb-4 pt-2">
          {talking && info.moods.idle?.length ? <div className="pointer-events-none absolute -top-[104px] left-3 h-[120px] w-[90px]"><Character moods={info.moods} mood={mood} className="h-full w-full" /></div> : null}
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-2 py-1.5 shadow-[0_10px_30px_-12px_rgba(35,32,27,.25)] focus-within:border-[var(--gold)]">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Ask ${p.name} about ${her} day`} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[15px] outline-none" />
            <button disabled={!!pending || !q.trim()} className="rounded-xl bg-[var(--ink)] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-40">Ask</button>
          </form>
          <p className="mt-1.5 text-center text-[11.5px] text-[var(--ink3)]">{p.name}&apos;s person can see what you ask here.</p>
        </div>
      </div>
    </main>
  );
}
