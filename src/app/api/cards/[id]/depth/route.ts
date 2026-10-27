import { NextResponse } from "next/server";
import { samPhrase } from "@/lib/finish";
import { depthLayers } from "@/lib/meta";
import { load, save } from "@/lib/store";
import { withUser } from "@/lib/session";

export const maxDuration = 120; // seconds; model calls and painting take a while

// Make a card's depth layers again: the pet with what it wears and holds, and the scene without it.
export const POST = withUser(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const s = await load();
  const card = s.cards.find((c) => c.id === id);
  const pet = card && s.pets.find((p) => p.id === card.petId);
  if (!card?.art || !pet) return NextResponse.json({ error: "card has no art" }, { status: 404 });
  const { fg, plate } = await depthLayers(card.art.replace("/api/art/", "").replace(/\?.*$/, ""), samPhrase(pet.species));
  const v = Date.now().toString(36);
  card.fg = fg ? `/api/art/${fg}?v=${v}` : null;
  card.plate = plate ? `/api/art/${plate}?v=${v}` : null;
  await save(s);
  return NextResponse.json({ card });
});
