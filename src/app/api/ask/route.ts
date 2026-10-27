import { NextResponse } from "next/server";
import { ask } from "@/lib/ask";
import { transcribe } from "@/lib/meta";
import { load, newId, update } from "@/lib/store";
import { withUser } from "@/lib/session";
import { overLimit } from "@/lib/limits";

export const maxDuration = 60; // seconds; model calls and painting take a while

// Ask the pet: a typed or spoken question (WAV) in, the pet's answer with the imprints it rests on out.
export const POST = withUser(async (req: Request) => {
  const limited = await overLimit("ask");
  if (limited) return limited;
  const form = await req.formData();
  const audio = form.get("audio");
  const typed = String(form.get("question") ?? "").trim();
  const question = typed || (audio instanceof File ? await transcribe(Buffer.from(await audio.arrayBuffer())) : "");
  if (!question) return NextResponse.json({ error: "no question" }, { status: 400 });
  const s = await load();
  const pet = s.pets.find((p) => p.id === String(form.get("petId") ?? ""));
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const result = await ask(s, pet, question);
  // keep the exchange in its conversation (a new one when no thread is given)
  const now = new Date().toISOString();
  const threadId = String(form.get("threadId") ?? "") || newId("th");
  await update((f) => {
    f.threads ??= [];
    let t = f.threads.find((x) => x.id === threadId);
    if (!t) {
      t = { id: threadId, petId: pet.id, title: question.slice(0, 60), createdAt: now, updatedAt: now, turns: [] };
      f.threads.push(t);
    }
    t.turns.push({ question, answer: result.answer, mood: result.mood, basis: result.basis, general: result.general, gap: result.gap, action: result.action, at: now });
    t.updatedAt = now;
  });
  return NextResponse.json({ question, threadId, ...result });
});
