import { NextResponse } from "next/server";
import { ask } from "@/lib/ask";
import { transcribe } from "@/lib/meta";
import { runAs } from "@/lib/session";
import { openShare, sharedContext } from "@/lib/shares";
import { newId, update } from "@/lib/store";

export const maxDuration = 60;
const PER_DAY = 40; // questions per link per day

// A sitter asks the pet's twin (no sign-in). It answers only from what the owner shared; the conversation is kept
// in the owner's Recent, so the owner sees what the sitter wanted to know.
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const o = await openShare(token, "sitter");
  if (!o) return NextResponse.json({ error: "This link is no longer active." }, { status: 404 });
  const form = await req.formData();
  return runAs(o.ownerId, async () => {
    const today = new Date().toISOString().slice(0, 10);
    const asked = (o.state.threads ?? []).filter((t) => t.via?.token === token).flatMap((t) => t.turns).filter((t) => t.at.startsWith(today)).length;
    if (asked >= PER_DAY) return NextResponse.json({ error: "That's all the questions for today on this link." }, { status: 429 });

    const audio = form.get("audio");
    const typed = String(form.get("question") ?? "").trim().slice(0, 500);
    const question = typed || (audio instanceof File ? await transcribe(Buffer.from(await audio.arrayBuffer())) : "");
    if (!question) return NextResponse.json({ error: "no question" }, { status: 400 });

    const result = await ask(o.state, o.pet, question, { context: sharedContext(o), audience: "sitter" });
    const now = new Date().toISOString();
    // one conversation per link per day in the owner's Recent
    await update((s) => {
      s.threads ??= [];
      let t = s.threads.find((x) => x.via?.token === token && x.createdAt.startsWith(today));
      if (!t) {
        t = { id: newId("th"), petId: o.pet.id, title: `${o.share.label} · ${today}`, createdAt: now, updatedAt: now, turns: [], via: { kind: "sitter", token } };
        s.threads.push(t);
      }
      t.turns.push({ question, answer: result.answer, mood: result.mood, basis: result.basis, general: result.general, gap: result.gap, at: now });
      t.updatedAt = now;
    });
    const media = (f: string | null) => (f ? `/api/s/${token}/media/${f.replace("/api/art/", "").replace(/\?.*$/, "")}` : null);
    return NextResponse.json({ question, ...result, cards: result.cards.map((c) => ({ ...c, art: media(c.art), photoId: null })) });
  });
}
