import { NextResponse } from "next/server";
import { load, save } from "@/lib/store";
import type { Pet } from "@/lib/types";

const EDITABLE = ["name", "species", "breed", "born", "sex", "credential", "appearance"] as const;

// The owner corrects or adds profile fields; owner input always wins over what the model guessed.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<Pet>;
  const s = await load();
  const pet = s.pets.find((p) => p.id === id);
  if (!pet) return NextResponse.json({ error: "not found" }, { status: 404 });
  for (const k of EDITABLE) if (k in body) (pet as Record<string, unknown>)[k] = body[k];
  await save(s);
  return NextResponse.json({ pet });
}
