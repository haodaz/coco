import { NextResponse } from "next/server";
import { makeCharacter } from "@/lib/character";
import { LIVE } from "@/lib/meta";
import { load, save } from "@/lib/store";

// Bring the pet to life as a character (about a minute: one design, five moods, a few frames each).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!LIVE) return NextResponse.json({ error: "the character needs live mode" }, { status: 400 });
  const s = await load();
  const pet = s.pets.find((p) => p.id === id);
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const character = await makeCharacter(s, pet);
  // the state may have changed during the minute it took; write onto a fresh copy
  const fresh = await load();
  const p = fresh.pets.find((x) => x.id === id);
  if (p) p.character = character;
  await save(fresh);
  return NextResponse.json({ character });
}
