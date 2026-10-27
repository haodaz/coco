import { NextResponse } from "next/server";
import { samPhrase } from "@/lib/finish";
import { depthLayer } from "@/lib/meta";
import { load, save } from "@/lib/store";

// Cut a card's depth layer again (after the cutout rules change, or when a layer came out wrong).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await load();
  const card = s.cards.find((c) => c.id === id);
  const pet = card && s.pets.find((p) => p.id === card.petId);
  if (!card?.art || !pet) return NextResponse.json({ error: "card has no art" }, { status: 404 });
  const fg = await depthLayer(card.art.replace("/api/art/", ""), samPhrase(pet.species));
  card.fg = fg ? `/api/art/${fg}?v=${Date.now().toString(36)}` : null;
  await save(s);
  return NextResponse.json({ card });
}
