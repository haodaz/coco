"use client";

import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { toWav } from "@/lib/wav";
import type { Card } from "@/lib/types";

// Under a card: the owner says or types what happened in this moment. One sentence is enough.
export default function NoteBox({ card, petName, onSaved }: { card: Card; petName: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "recording" | "saving">("idle");
  const rec = useRef<MediaRecorder | null>(null);

  async function send(body: FormData) {
    setState("saving");
    await fetch(`/api/cards/${card.id}/note`, { method: "POST", body });
    setState("idle");
    setOpen(false);
    setText("");
    onSaved();
  }
  async function record() {
    if (state === "recording") return rec.current?.stop();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const fd = new FormData();
      fd.append("audio", await toWav(new Blob(chunks, { type: r.mimeType })), "note.wav");
      send(fd);
    };
    rec.current = r;
    r.start();
    setState("recording");
  }

  if (card.note && !open)
    return (
      <button onClick={() => { setText(card.note!.text); setOpen(true); }} className="mt-1.5 block w-full px-1 text-left text-[11.5px] leading-snug text-[#3d4460]">
        <span className="text-[var(--sub)]">You said:</span> “{card.note.text}”
      </button>
    );
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-1.5 px-1 text-[12px] font-medium text-[var(--primary)]">
        + What happened here?
      </button>
    );
  return (
    <div className="mt-2 rounded-xl border border-[var(--line)] bg-white p-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={`Tell ${petName}'s AI about this moment. Why, how often, who was there…`}
        className="w-full resize-none bg-transparent text-[12.5px] leading-snug outline-none placeholder:text-[#a3a8b8]"
      />
      <div className="mt-1 flex items-center gap-2">
        <button onClick={record} disabled={state === "saving"} title={state === "recording" ? "Stop" : "Say it"} className={`grid h-8 w-8 place-items-center rounded-full ${state === "recording" ? "animate-pulse bg-[#ff4d4f] text-white" : "bg-[#f2f3f7] text-[#3d4460]"}`}>
          {state === "recording" ? <Square size={13} /> : <Mic size={15} />}
        </button>
        <span className="text-[11px] text-[var(--sub)]">{state === "recording" ? "Listening… tap to stop" : state === "saving" ? "Remembering…" : ""}</span>
        <button onClick={() => setOpen(false)} className="ml-auto text-[12px] text-[var(--sub)]">Cancel</button>
        <button
          disabled={!text.trim() || state !== "idle"}
          onClick={() => { const fd = new FormData(); fd.append("text", text.trim()); send(fd); }}
          className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
