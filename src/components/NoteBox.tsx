"use client";

import { Mic, Square } from "lucide-react";
import { useState } from "react";
import { useRecorder } from "@/lib/useRecorder";
import type { Card } from "@/lib/types";
import { call } from "@/lib/api";

// Under a card: the owner says or types what happened in this moment. One sentence is enough.
export default function NoteBox({ card, petName, onSaved }: { card: Card; petName: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function send(body: FormData) {
    setSaving(true);
    await call(`/api/cards/${card.id}/note`, { method: "POST", body });
    setSaving(false);
    setOpen(false);
    setText("");
    onSaved();
  }
  const { recording, toggle } = useRecorder((wav) => {
    const fd = new FormData();
    fd.append("audio", wav, "note.wav");
    send(fd);
  });
  const state = recording ? "recording" : saving ? "saving" : "idle";

  if (card.note && !open)
    return (
      <button onClick={() => { setText(card.note!.text); setOpen(true); }} className="mt-1.5 block w-full px-1 text-left text-[11.5px] leading-snug text-[#3d4460]">
        <span className="text-[var(--ink3)]">You said:</span> “{card.note.text}”
      </button>
    );
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-1.5 px-1 text-[12px] font-medium text-[var(--gold)]">
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
        <button onClick={toggle} disabled={state === "saving"} title={state === "recording" ? "Stop" : "Say it"} className={`grid h-8 w-8 place-items-center rounded-full ${state === "recording" ? "animate-pulse bg-[#ff4d4f] text-white" : "bg-[#f2f3f7] text-[#3d4460]"}`}>
          {state === "recording" ? <Square size={13} /> : <Mic size={15} />}
        </button>
        <span className="text-[11px] text-[var(--ink3)]">{state === "recording" ? "Listening… tap to stop" : state === "saving" ? "Remembering…" : ""}</span>
        <button onClick={() => setOpen(false)} className="ml-auto text-[12px] text-[var(--ink3)]">Cancel</button>
        <button
          disabled={!text.trim() || state !== "idle"}
          onClick={() => { const fd = new FormData(); fd.append("text", text.trim()); send(fd); }}
          className="rounded-lg bg-[var(--ink)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
