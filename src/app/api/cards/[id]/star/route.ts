import { NextResponse } from "next/server";
import { update } from "@/lib/store";
import { withUser } from "@/lib/session";

// Star or unstar a card: the owner's favourites.
export const POST = withUser(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { starred } = (await req.json()) as { starred?: boolean };
  let found = false;
  await update((s) => {
    const c = s.cards.find((x) => x.id === id);
    if (c) {
      c.starred = !!starred;
      found = true;
    }
  });
  return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "card not found" }, { status: 404 });
});
