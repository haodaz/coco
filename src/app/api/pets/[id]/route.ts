import { NextResponse } from "next/server";
import { load, save, update } from "@/lib/store";
import type { Pet } from "@/lib/types";
import { withUser } from "@/lib/session";

const EDITABLE = ["name", "species", "breed", "born", "sex", "credential", "appearance"] as const;

// The owner corrects or adds profile fields; owner input always wins over what the model guessed.
export const PATCH = withUser(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<Pet>;
  const s = await load();
  const pet = s.pets.find((p) => p.id === id);
  if (!pet) return NextResponse.json({ error: "not found" }, { status: 404 });
  for (const k of EDITABLE) if (k in body) (pet as Record<string, unknown>)[k] = body[k];
  await save(s);
  return NextResponse.json({ pet });
});

// Before the owner has confirmed the profile they can start again with another photo: the unconfirmed pet and what
// was made from its first photo go away. A confirmed pet is never removed here.
export const DELETE = withUser(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  let gone = false;
  await update((s) => {
    const pet = s.pets.find((p) => p.id === id);
    if (!pet || pet.name) return;
    s.pets = s.pets.filter((p) => p.id !== id);
    s.photos = s.photos.filter((p) => p.petId !== id);
    s.cards = s.cards.filter((c) => c.petId !== id);
    gone = true;
  });
  return gone ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Only a pet that isn't confirmed yet can be started again." }, { status: 400 });
});
