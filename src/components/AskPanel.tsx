"use client";

import { Mic, Square } from "lucide-react";
import { useState } from "react";
import { useRecorder } from "@/lib/useRecorder";
import type { Pet } from "@/lib/types";

type Reply = {
  question: string;
  answer: string;
  basis: { cardId: string; how: string }[];
  cards: { id: string; name: string; art: string | null; photoId: string }[];
  general: string[];
  gap: { topic: string; suggest: string } | null;
};

const STARTERS = ["What do you love most?", "Where do you like to sleep?", "I'm going to the store this afternoon. Want to come?"];

// Ask the pet. Each answer shows the cards it rests on, keeps general knowledge apart,
// and names what the pet hasn't shown yet instead of making it up.
export default function AskPanel({ pet }: { pet: Pet }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);

  async function send(body: FormData) {
    setBusy(true);
    body.append("petId", pet.id);
    const r = await (await fetch("/api/ask", { method: "POST", body })).json();
    setBusy(false);
    if (r.answer) setReplies((rs) => [r, ...rs]);
  }
  const ask = (text: string) => {
    if (!text.trim()) return;
    const fd = new FormData();
    fd.append("question", text.trim());
    setQ("");
    send(fd);
  };
  const { recording, toggle } = useRecorder((wav) => {
    const fd = new FormData();
    fd.append("audio", wav, "question.wav");
    send(fd);
  });

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(40,50,110,.08)]">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/likeness/${pet.id}`} alt="" className="h-10 w-10 rounded-full object-cover [image-rendering:pixelated]" />
        <div>
          <div className="text-[17px] font-bold leading-tight">Ask {pet.name}</div>
          <div className="text-[12.5px] text-[var(--sub)]">{pet.name} answers from the moments you&apos;ve shared, and says when it doesn&apos;t know yet.</div>
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--line)] px-2 py-1.5 focus-within:border-[var(--primary)]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={recording ? "Listening… tap the square to stop" : `Ask ${pet.name} anything`} className="min-w-0 flex-1 bg-transparent px-1 text-[14px] outline-none" />
        <button type="button" onClick={toggle} disabled={busy} title={recording ? "Stop" : "Say it"} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${recording ? "animate-pulse bg-[#ff4d4f] text-white" : "bg-[#f2f3f7] text-[#3d4460]"}`}>
          {recording ? <Square size={13} /> : <Mic size={15} />}
        </button>
        <button disabled={busy || !q.trim()} className="rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40">Ask</button>
      </form>
      {!replies.length && !busy && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STARTERS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full bg-[#f2f3f7] px-3 py-1 text-[12.5px] text-[#3d4460] hover:bg-[#e8f1ff]">{s}</button>)}
        </div>
      )}
      {busy && <div className="mt-4 animate-pulse text-[13px] text-[var(--sub)]">{pet.name} is thinking back…</div>}
      <div className="mt-4 space-y-5">
        {replies.map((r, i) => (
          <div key={i}>
            <div className="text-right"><span className="inline-block rounded-2xl rounded-br-md bg-[#eef3ff] px-3.5 py-2 text-[13.5px] text-[#1d2233]">{r.question}</span></div>
            <div className="mt-2 max-w-[90%] rounded-2xl rounded-bl-md bg-[#f6f7fb] px-3.5 py-2.5 text-[14px] leading-relaxed">{r.answer}</div>
            {r.cards.length > 0 && (
              <div className="mt-2">
                <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--sub)]">Because</div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {r.cards.map((c, k) => (
                    <a key={c.id} href={`#card-${c.id}`} className="flex max-w-[280px] items-center gap-2 rounded-xl border border-[var(--line)] bg-white p-1.5 pr-3 hover:border-[var(--primary)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.art ?? `/api/photos/${c.photoId}`} alt="" className="h-11 w-8 shrink-0 rounded-md object-cover" />
                      <span className="min-w-0 text-[12px] leading-snug"><b className="block truncate">{c.name}</b><span className="text-[var(--sub)]">{r.basis[k]?.how}</span></span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {r.general.length > 0 && <div className="mt-2 text-[12px] text-[var(--sub)]"><b>General knowledge, not a memory:</b> {r.general.join(" ")}</div>}
            {r.gap && (
              <div className="mt-2 rounded-xl border border-dashed border-[#c9cede] px-3 py-2 text-[12.5px] text-[#3d4460]">
                {pet.name} hasn&apos;t shown you <b>{r.gap.topic}</b> yet. A photo for <b>{r.gap.suggest}</b> would teach it.
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
