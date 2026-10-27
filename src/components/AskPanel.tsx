"use client";

import { Mic, PanelRightOpen, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ActionPanel from "@/components/ActionPanel";
import Character, { type Mood } from "@/components/Character";
import Companion, { spotCoco } from "@/components/Companion";
import type { Memory } from "@/components/MemoryPanel";
import { call } from "@/lib/api";
import { useRecorder } from "@/lib/useRecorder";
import type { Card, ChatTurn, Pet, PetAction, State } from "@/lib/types";

const STARTERS = (name: string) => ["What do you love most?", "Where do you like to sleep?", "I'm going to the store this afternoon. Want to come?", `What don't you know about yourself yet, ${name}?`];

// Talking with the pet. Its character stands on the left and its face follows the conversation; the conversation is
// kept (the sidebar's Recent), every answer names the cards it rests on, and it says when it doesn't know yet.
export default function AskPanel({
  pet,
  state,
  threadId,
  firstQuestion,
  onThread,
  onBringToLife,
  openCard,
  memory,
  admin = false,
  refresh,
}: {
  pet: Pet;
  state: State;
  threadId: string | null;
  firstQuestion?: string | null;
  onThread: (id: string) => void;
  onBringToLife: () => Promise<void>;
  openCard: (c: Card) => void;
  memory?: Memory;
  admin?: boolean;
  refresh: () => void;
}) {
  const [panel, setPanel] = useState<PetAction | null>(null);
  const saved = (state.threads ?? []).find((t) => t.id === threadId)?.turns ?? [];
  const [turns, setTurns] = useState<ChatTurn[]>(saved);
  const [pending, setPending] = useState<string | null>(null);
  const [waiting, setWaiting] = useState<Mood>("busy");
  const [q, setQ] = useState("");
  const [making, setMaking] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const asked = useRef(false);
  const mine = useRef<string | null>(null); // the thread this page just created, so switching to it doesn't wipe the turns

  // switching conversations in the sidebar
  useEffect(() => {
    if (threadId && threadId === mine.current) return;
    setTurns((state.threads ?? []).find((t) => t.id === threadId)?.turns ?? []);
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  async function send(body: FormData, shown: string) {
    setPending(shown);
    setWaiting("busy");
    const t = setTimeout(() => setWaiting("thinking"), 3500); // first it goes through its cards, then it thinks
    body.append("petId", pet.id);
    if (threadId) body.append("threadId", threadId);
    const r = await call<ChatTurn & { threadId: string; question: string }>("/api/ask", { method: "POST", body });
    clearTimeout(t);
    setPending(null);
    if (!r) return;
    setTurns((ts) => [...ts, { ...r, at: new Date().toISOString() }]);
    if (r.action) setPanel(r.action); // the pet opened something beside the conversation
    if (r.threadId !== threadId) {
      mine.current = r.threadId;
      onThread(r.threadId);
    }
    window.dispatchEvent(new Event("coco-refresh")); // the sidebar's Recent
  }
  const ask = (text: string) => {
    if (!text.trim() || pending) return;
    const fd = new FormData();
    fd.append("question", text.trim());
    setQ("");
    send(fd, text.trim());
  };
  // a question handed over from elsewhere (a card's "talk about this moment", Home's box)
  useEffect(() => {
    if (firstQuestion && !asked.current) {
      asked.current = true;
      ask(firstQuestion);
    }
  }, [firstQuestion]); // eslint-disable-line react-hooks/exhaustive-deps
  const { recording, toggle } = useRecorder((wav) => {
    const fd = new FormData();
    fd.append("audio", wav, "question.wav");
    send(fd, "🎙 …");
  });

  const last = turns[turns.length - 1];
  const mood: Mood = pending ? waiting : recording ? "close" : ((last?.mood as Mood) ?? "idle");
  const cardOf = (id: string) => state.cards.find((c) => c.id === id);

  const LABEL: Record<PetAction["type"], string> = { show_cards: "the cards", open_card: "the card", open_pack: "today's pack", add_photo: "a place to add a photo", show_memory: "how well I know myself", make_link: "a link" };
  const character = (cls: string) =>
    pet.character ? (
      <Character moods={pet.character.moods} mood={mood} version={pet.character.at} className={cls} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/likeness/${pet.id}`} alt="" className={`${cls} rounded-xl object-cover [image-rendering:pixelated]`} />
    );

  return (
    <div className={`grid h-[calc(100dvh-112px)] gap-5 ${panel ? "lg:grid-cols-[minmax(0,1fr)_440px]" : ""}`}>
      <section className="relative flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {!turns.length && !pending ? (
            <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
              <div className="relative aspect-[3/4] w-[200px]">{character("h-full w-full")}</div>
              <div className="serif mt-2 text-[30px] font-bold">Hi, it&apos;s me, {pet.name}.</div>
              <p className="mt-1 max-w-md text-[14.5px] text-[var(--ink2)]">Ask me anything about us. If I haven&apos;t seen something yet, I&apos;ll say so and open a way to show me.</p>
              {!pet.character && (
                <button disabled={making} onClick={async () => { setMaking(true); await onBringToLife(); setMaking(false); }} className="mt-4 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-[14px] font-semibold text-white disabled:opacity-60">
                  {making ? `Drawing ${pet.name}… about two minutes` : `Bring ${pet.name} to life`}
                </button>
              )}
              <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                {STARTERS(pet.name).map((q) => <button key={q} onClick={() => ask(q)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px] text-[var(--ink2)] hover:border-[var(--gold)]">{q}</button>)}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 pb-24 pt-2">
              {turns.map((t, i) => (
                <div key={i}>
                  <div className="text-right"><span className="inline-block max-w-[85%] rounded-2xl rounded-br-md bg-[#efe6d6] px-4 py-2 text-left text-[14.5px]">{t.question}</span></div>
                  <div className="mt-2 max-w-[92%] rounded-2xl rounded-bl-md border border-[var(--line)] bg-white px-4 py-3 text-[16px] leading-relaxed">
                    {t.answer}
                    {t.basis.length > 0 && (
                      <div className="mt-3 border-t border-[var(--line)] pt-2.5">
                        <div className="text-[10.5px] font-bold uppercase tracking-[.14em] text-[var(--ink3)]">I remember this from</div>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {t.basis.map((b) => {
                            const c = cardOf(b.cardId);
                            return c ? (
                              <button key={b.cardId} data-coco-spot={`cite-${i}-${c.id}`} data-coco-side="left" onMouseEnter={() => spotCoco(`cite-${i}-${c.id}`)} onMouseLeave={() => spotCoco(null)} onClick={() => setPanel({ type: "open_card", cardIds: [c.id], topic: null, slotId: null, kind: null })} className="flex max-w-[260px] items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-1.5 pr-3 text-left hover:border-[var(--gold)]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={c.art ?? `/api/photos/${c.photoId}`} alt="" className="h-11 w-8 shrink-0 rounded-md object-cover" />
                                <span className="min-w-0 text-[12px] leading-snug"><b className="block truncate">{c.name}</b><span className="text-[var(--ink2)]">{b.how}</span></span>
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {t.general.length > 0 && <div className="mt-2 text-[12px] text-[var(--ink3)]"><b>General knowledge, not a memory:</b> {t.general.join(" ")}</div>}
                    {t.gap && <div className="mt-3 rounded-xl border border-dashed border-[var(--line)] px-3 py-2 text-[12.5px] text-[var(--ink2)]">I haven&apos;t shown you <b>{t.gap.topic}</b> yet. A photo for <b>{t.gap.suggest}</b> would teach me.</div>}
                    {t.action && (
                      <button onClick={() => setPanel(t.action!)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fff1d6] px-3 py-1 text-[12.5px] font-medium text-[#7a5618] hover:bg-[#ffe8b8]">
                        <PanelRightOpen size={14} /> I opened {LABEL[t.action.type]}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {pending && (
                <div>
                  <div className="text-right"><span className="inline-block max-w-[85%] rounded-2xl rounded-br-md bg-[#efe6d6] px-4 py-2 text-[14.5px]">{pending}</span></div>
                  <div className="mt-2 inline-block animate-pulse rounded-2xl rounded-bl-md border border-[var(--line)] bg-white px-4 py-3 text-[15px] text-[var(--ink3)]">{waiting === "busy" ? "Looking through our moments…" : "Thinking…"}</div>
                </div>
              )}
              <div ref={end} />
            </div>
          )}
        </div>

        {/* the composer, with the pet resting on its top edge once you're talking */}
        <div className="relative mx-auto w-full max-w-3xl pt-2">
          <form data-coco-spot="composer" data-coco-x="0.03" onSubmit={(e) => { e.preventDefault(); ask(q); }} className="relative flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-2 py-1.5 shadow-[0_10px_30px_-12px_rgba(35,32,27,.25)] focus-within:border-[var(--gold)]">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={recording ? "Listening… tap the square to stop" : `Say something to ${pet.name}`} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[15px] outline-none" />
            <button type="button" onClick={toggle} disabled={!!pending} title={recording ? "Stop" : "Say it"} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${recording ? "animate-pulse bg-[#ff4d4f] text-white" : "bg-[#f1ebe0] text-[var(--ink2)]"}`}>
              {recording ? <Square size={14} /> : <Mic size={16} />}
            </button>
            <button disabled={!!pending || !q.trim()} className="rounded-xl bg-[var(--ink)] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-40">Send</button>
          </form>
          <p className="mt-1.5 text-center text-[11.5px] text-[var(--ink3)]">{pet.name} answers only from the moments you&apos;ve shared.</p>
        </div>
      </section>

      {(turns.length > 0 || !!pending) && pet.character && <Companion moods={pet.character.moods} mood={mood} version={pet.character.at} home={panel ? "panel" : "composer"} />}
      {panel && (
        <div className="fixed inset-x-3 bottom-3 top-24 z-40 lg:static lg:inset-auto lg:z-auto lg:h-full">
          <ActionPanel action={panel} pet={pet} state={state} memory={memory} admin={admin} onClose={() => setPanel(null)} refresh={refresh} />
        </div>
      )}
    </div>
  );
}
