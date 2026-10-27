import { NextResponse } from "next/server";
import { SENSES } from "@/lib/memory";
import { openShare, sharedCards } from "@/lib/shares";
import { packFor } from "@/lib/species";

export const dynamic = "force-dynamic";

// A sitter's view of the pet (no sign-in): who it is, which kinds of moment its owner shared, and those cards.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const o = await openShare(token, "sitter");
  if (!o) return NextResponse.json({ error: "This link is no longer active." }, { status: 404 });
  const media = (f: string | null | undefined) => (f ? `/api/s/${token}/media/${f.replace("/api/art/", "").replace(/\?.*$/, "")}` : null);
  const { pet, share, state } = o;
  const kinds = new Set(packFor(pet.species).quest.map((q) => q.pattern));
  return NextResponse.json({
    pet: { name: pet.name, species: pet.species, breed: pet.breed, sex: pet.sex, born: pet.born },
    label: share.label,
    topics: share.topics.filter((t) => kinds.has(t)).map((t) => SENSES[t]),
    moods: Object.fromEntries(Object.entries(pet.character?.moods ?? {}).map(([m, frames]) => [m, frames.map((f) => media(f)!)])),
    cards: sharedCards(state, pet, share)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => ({ id: c.id, name: c.name, line: c.line, rarity: c.rarity, style: c.style, art: media(c.art), fg: media(c.fg) })),
  });
}
