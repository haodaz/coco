import { NextResponse } from "next/server";
import { ask } from "@/lib/ask";
import { transcribe } from "@/lib/meta";
import { load } from "@/lib/store";
import { withUser } from "@/lib/session";

// Ask the pet: a typed or spoken question (WAV) in, the pet's answer with the imprints it rests on out.
export const POST = withUser(async (req: Request) => {
  const form = await req.formData();
  const audio = form.get("audio");
  const typed = String(form.get("question") ?? "").trim();
  const question = typed || (audio instanceof File ? await transcribe(Buffer.from(await audio.arrayBuffer())) : "");
  if (!question) return NextResponse.json({ error: "no question" }, { status: 400 });
  const s = await load();
  const pet = s.pets.find((p) => p.id === String(form.get("petId") ?? ""));
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  return NextResponse.json({ question, ...(await ask(s, pet, question)) });
});
