import { NextResponse } from "next/server";
import { openShare, publicCards } from "@/lib/shares";

export const dynamic = "force-dynamic";

// What a public link shows (no sign-in): the pet's name and kind, its character's first frame, and the cards the
// link is for. Paintings only; a photo never leaves the owner's account this way.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const o = (await openShare(token, "card")) ?? (await openShare(token, "pet"));
  if (!o) return NextResponse.json({ error: "This link is no longer active." }, { status: 404 });
  const media = (f: string | null | undefined) => (f ? `/api/s/${token}/media/${f.replace("/api/art/", "").replace(/\?.*$/, "")}` : null);
  const { pet, share, state } = o;
  const mine = state.cards.filter((c) => c.petId === pet.id && !c.sealed && !c.versionOf);
  return NextResponse.json({
    kind: share.kind,
    pet: { name: pet.name, species: pet.species, breed: pet.breed, sex: pet.sex, face: media(pet.character?.moods.idle?.[0]) },
    counts: { prints: mine.filter((c) => c.kind !== "legendary").length, legends: mine.filter((c) => c.rarity === 3).length },
    cards: publicCards(o).map((c) => ({ id: c.id, name: c.name, line: c.line, rarity: c.rarity, style: c.style, kind: c.kind, art: media(c.art), fg: media(c.fg), plate: media(c.plate) })),
  });
}
