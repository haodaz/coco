import { NextResponse } from "next/server";
import { withUser } from "@/lib/session";
import { newToken } from "@/lib/shares";
import { packFor, type Pattern } from "@/lib/species";
import { update } from "@/lib/store";
import type { Share } from "@/lib/types";

export const dynamic = "force-dynamic";

// The owner's links: make one for a sitter or a playdate (choosing which kinds of moment it shares), or revoke one.
export const POST = withUser(async (req: Request) => {
  const body = (await req.json()) as { action?: "create" | "revoke"; kind?: Share["kind"]; petId?: string; topics?: Pattern[]; label?: string; token?: string; cardId?: string };
  if (body.action === "revoke" && body.token) {
    await update((s) => {
      const sh = s.shares?.find((x) => x.token === body.token);
      if (sh) sh.revokedAt = new Date().toISOString();
    });
    return NextResponse.json({ ok: true });
  }
  if (!["sitter", "playdate", "card", "pet"].includes(body.kind ?? "")) return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  let share: Share | null = null;
  await update((s) => {
    const pet = s.pets.find((p) => p.id === body.petId) ?? s.pets[0];
    if (!pet) return;
    const known = new Set(packFor(pet.species).quest.map((q) => q.pattern));
    const topics = (body.topics ?? []).filter((t) => known.has(t));
    // a public link to one card or to the pet's universe: one per card / per pet, reused if it already exists
    if (body.kind === "card" || body.kind === "pet") {
      const card = body.kind === "card" ? s.cards.find((c) => c.id === body.cardId && c.petId === pet.id && !c.sealed && c.art) : null;
      if (body.kind === "card" && !card) return;
      const had = s.shares?.find((x) => x.kind === body.kind && x.petId === pet.id && !x.revokedAt && (body.kind === "pet" || x.cardId === card!.id));
      if (had) {
        share = had;
        return;
      }
      share = { token: newToken(), kind: body.kind, petId: pet.id, topics: [...known], label: body.kind === "card" ? card!.name : `${pet.name}'s universe`, createdAt: new Date().toISOString(), cardId: card?.id ?? null };
      s.shares ??= [];
      s.shares.push(share);
      return;
    }
    share = {
      token: newToken(),
      kind: body.kind!,
      petId: pet.id,
      topics: topics.length ? topics : [...known],
      label: (body.label ?? "").trim().slice(0, 60) || (body.kind === "sitter" ? "For a sitter" : "Playdate invite"),
      createdAt: new Date().toISOString(),
    };
    s.shares ??= [];
    s.shares.push(share);
  });
  if (!share) return NextResponse.json({ error: "no pet yet" }, { status: 400 });
  return NextResponse.json({ share });
});
