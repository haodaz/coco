"use client";

import { Mic, Square } from "lucide-react";
import { useState } from "react";
import Character, { type Mood } from "@/components/Character";
import { useRecorder } from "@/lib/useRecorder";
import type { Pet } from "@/lib/types";

type Reply = {
  question: string;
  answer: string;
  basis: { cardId: string; how: string }[];
  cards: { id: string; name: string; art: string | null; photoId: string }[];
  general: string[];
  gap: { topic: string; suggest: string } | null;
  mood: Mood;
};

const STARTERS = ["What do you love most?", "Where do you like to sleep?", "I'm going to the store this afternoon. Want to come?"];

// Talk with the pet. It answers in its own voice from the moments you've shared, its face follows the answer,
// each answer shows the cards it rests on, and it says when it doesn't know yet.
export default function AskPanel({ pet, onBringToLife }: { pet: Pet; onBringToLife: () => Promise<void> }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState<Mood>("busy");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [making, setMaking] = useState(false);

  async function send(body: FormData) {
    setBusy(true);
    setWaiting("busy");
    const t = setTimeout(() => setWaiting("thinking"), 3500); // first it goes through its cards, then it thinks
    body.append("petId", pet.id);
    const r = await (await fetch("/api/ask", { method: "POST", body })).json();
    clearTimeout(t);
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

  const latest = replies[0];
  const mood: Mood = busy ? waiting : recording ? "close" : latest?.mood ?? "idle";
  const say = busy ? (waiting === "busy" ? "Let me look through our moments…" : "Hmm, let me think…") : recording ? "I'm listening." : latest?.answer ?? `Hi, it's me, ${pet.name}. Ask me anything about us.`;

  return (
    <section className="grid items-start gap-6 md:grid-cols-[minmax(260px,400px)_1fr]">
      <div className="md:sticky md:top-20">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[240px] md:max-w-[400px]">
          {pet.character ? (
            <Character moods={pet.character.moods} mood={mood} version={pet.character.at} className="h-full w-full" />
          ) : (
            <div className="grid h-full place-items-center rounded-3xl bg-white/60 p-6 text-center">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/likeness/${pet.id}`} alt="" className="mx-auto w-40 rounded-xl [image-rendering:pixelated]" />
                <button
                  disabled={making}
                  onClick={async () => { setMaking(true); await onBringToLife(); setMaking(false); }}
                  className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
                >
                  {making ? `Drawing ${pet.name}… about a minute` : `Bring ${pet.name} to life`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="relative rounded-3xl rounded-tl-md bg-white px-5 py-4 text-[16.5px] leading-relaxed shadow-[0_8px_30px_rgba(40,50,110,.10)]">
          <div className={busy ? "animate-pulse text-[var(--sub)]" : ""}>{say}</div>
          {!busy && latest && latest.cards.length > 0 && (
            <div className="mt-3 border-t border-[var(--line)] pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--sub)]">I remember this from</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {latest.cards.map((c, k) => (
                  <a key={c.id} href={`/cards#card-${c.id}`} className="flex max-w-[260px] items-center gap-2 rounded-xl border border-[var(--line)] bg-white p-1.5 pr-3 hover:border-[var(--primary)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.art ?? `/api/photos/${c.photoId}`} alt="" className="h-11 w-8 shrink-0 rounded-md object-cover" />
                    <span className="min-w-0 text-[12px] leading-snug"><b className="block truncate">{c.name}</b><span className="text-[var(--sub)]">{latest.basis[k]?.how}</span></span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {!busy && latest?.general.length ? <div className="mt-2 text-[12px] text-[var(--sub)]"><b>General knowledge, not a memory:</b> {latest.general.join(" ")}</div> : null}
          {!busy && latest?.gap && (
            <div className="mt-3 rounded-xl border border-dashed border-[#c9cede] px-3 py-2 text-[12.5px] text-[#3d4460]">
              I haven&apos;t shown you <b>{latest.gap.topic}</b> yet. A photo for <b>{latest.gap.suggest}</b> would teach me.
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-2 py-1.5 focus-within:border-[var(--primary)]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={recording ? "Listening… tap the square to stop" : `Ask ${pet.name} anything`} className="min-w-0 flex-1 bg-transparent px-2 py-1 text-[15px] outline-none" />
          <button type="button" onClick={toggle} disabled={busy} title={recording ? "Stop" : "Say it"} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${recording ? "animate-pulse bg-[#ff4d4f] text-white" : "bg-[#f2f3f7] text-[#3d4460]"}`}>
            {recording ? <Square size={14} /> : <Mic size={16} />}
          </button>
          <button disabled={busy || !q.trim()} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-40">Ask</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STARTERS.map((s) => <button key={s} disabled={busy} onClick={() => ask(s)} className="rounded-full bg-white px-3 py-1.5 text-[13px] text-[#3d4460] shadow-sm hover:bg-[#e8f1ff] disabled:opacity-50">{s}</button>)}
        </div>

        {replies.length > 1 && (
          <div className="mt-8">
            <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--sub)]">Earlier</div>
            <div className="mt-2 space-y-3">
              {replies.slice(1).map((r, i) => (
                <div key={i} className="text-[13.5px]">
                  <div className="text-[var(--sub)]">You: {r.question}</div>
                  <div className="mt-0.5">{pet.name}: {r.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
