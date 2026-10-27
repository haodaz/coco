import { NextResponse } from "next/server";
import { refreshLikeness } from "@/lib/likeness";
import { readOwnerNote, transcribe } from "@/lib/meta";
import { photoBase64 } from "@/lib/photos";
import { load, newId, save } from "@/lib/store";
import type { Trace } from "@/lib/types";
import { withUser } from "@/lib/session";
import { overLimit } from "@/lib/limits";

export const maxDuration = 120; // seconds; model calls and painting take a while

// The owner's words about a card, typed or spoken (WAV). They become traces marked as the owner's,
// the card's line is rewritten with them, and the AI's picture of the pet may sharpen.
export const POST = withUser(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const limited = await overLimit("note");
  if (limited) return limited;
  const { id } = await ctx.params;
  const form = await req.formData();
  const audio = form.get("audio");
  const typed = String(form.get("text") ?? "").trim();
  const text = typed || (audio instanceof File ? await transcribe(Buffer.from(await audio.arrayBuffer())) : "");
  if (!text) return NextResponse.json({ error: "nothing to add" }, { status: 400 });

  const s = await load();
  const card = s.cards.find((c) => c.id === id);
  const pet = card && s.pets.find((p) => p.id === card.petId);
  const photo = card && s.photos.find((p) => p.id === card.photoId);
  if (!card || !pet || !photo) return NextResponse.json({ error: "card not found" }, { status: 404 });

  const reading = await readOwnerNote(await photoBase64(photo.file), card, text, pet.name, pet.sex);
  // a new note replaces the old one, and the traces that came from it
  s.traces = s.traces.filter((t) => !(t.source.type === "note" && t.source.noteId === card.id));
  const traces: Trace[] = reading.traces.map((t) => ({ id: newId("tr"), petId: pet.id, ...t, source: { type: "note", noteId: card.id }, at: photo.takenAt }));
  s.traces.push(...traces);
  card.note = { text, via: typed ? "text" : "voice", at: new Date().toISOString() };
  card.line = reading.line;
  await refreshLikeness(s, pet).catch(() => false);
  await save(s);
  return NextResponse.json({ card, traces, text });
});
