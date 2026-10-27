import { NextResponse } from "next/server";
import { update } from "@/lib/store";
import { withUser } from "@/lib/session";

// The owner's own arrangement of the collection: card ids in the order they want them.
export const POST = withUser(async (req: Request) => {
  const { ids } = (await req.json()) as { ids?: string[] };
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids required" }, { status: 400 });
  await update((s) => {
    ids.forEach((id, i) => {
      const c = s.cards.find((x) => x.id === id);
      if (c) c.order = i;
    });
  });
  return NextResponse.json({ ok: true });
});
