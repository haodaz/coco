import { NextResponse } from "next/server";
import { petContext } from "@/lib/ask";
import { LIVE, memoryGraph } from "@/lib/meta";
import { load, update } from "@/lib/store";
import { withUser } from "@/lib/session";
import type { GraphEdge } from "@/lib/types";

export const maxDuration = 120;

// The pet's memory graph. Built from its cards the first time it is asked for, and again when the cards have
// changed since; every edge keeps only the cards that are really the pet's.
export const GET = withUser(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const s = await load();
  const pet = s.pets.find((p) => p.id === id);
  if (!pet) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { imprints, cards } = petContext(s, pet);
  if (pet.graph && pet.graph.basis === cards.length) return NextResponse.json({ graph: pet.graph });
  if (!LIVE || !imprints.length) return NextResponse.json({ graph: pet.graph ?? null });
  const real = new Set(cards.map((c) => c.id));
  const raw = await memoryGraph(pet.name, imprints.map(({ id, seen, ownerSaid, traces }) => ({ id, seen, ownerSaid, traces })));
  const edges: GraphEdge[] = raw
    .map((e) => ({ ...e, relation: e.relation.trim().toLowerCase(), object: e.object.trim().toLowerCase(), cardIds: [...new Set(e.cardIds.filter((c) => real.has(c)))] }))
    .filter((e) => e.cardIds.length && e.object);
  const graph = { edges, at: new Date().toISOString(), basis: cards.length };
  await update((f) => {
    const p = f.pets.find((x) => x.id === id);
    if (p) p.graph = graph;
  });
  return NextResponse.json({ graph });
});
