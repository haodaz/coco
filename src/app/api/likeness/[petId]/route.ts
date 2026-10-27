import { pixelated } from "@/lib/likeness";
import { clarityOf } from "@/lib/memory";
import { load } from "@/lib/store";
import { withUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// The AI's picture of the pet at its current clarity (or ?level=N to preview another level).
export const GET = withUser(async (req: Request, ctx: { params: Promise<{ petId: string }> }) => {
  const { petId } = await ctx.params;
  const s = await load();
  const pet = s.pets.find((p) => p.id === petId);
  if (!pet) return new Response("not found", { status: 404 });
  const q = new URL(req.url).searchParams.get("level");
  const level = q !== null && /^\d+$/.test(q) ? Number(q) : clarityOf(s, pet).level;
  return new Response(new Uint8Array(await pixelated(s, pet, level)), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
});
