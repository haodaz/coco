import { NextResponse } from "next/server";
import { samPhrase } from "@/lib/finish";
import { depthLayers } from "@/lib/meta";
import { load, update } from "@/lib/store";
import { isAdmin, withUser } from "@/lib/session";

export const maxDuration = 300;

// Give the signed-in admin's own layered cards a clean scene (and a fuller pet cut-out), a few at a time,
// so the old ones stop showing a ghost of the pet when they move. GET says how many are left.
const BATCH = 3;
const needs = (c: { fg?: string | null; plate?: string | null; art: string | null }) => !!c.fg && !c.plate && !!c.art;

export const GET = withUser(async () => {
  if (!isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  const s = await load();
  return NextResponse.json({ left: s.cards.filter(needs).length });
});

export const POST = withUser(async () => {
  if (!isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  const s = await load();
  const todo = s.cards.filter(needs).slice(0, BATCH);
  const v = Date.now().toString(36);
  const done = await Promise.all(
    todo.map(async (card) => {
      const pet = s.pets.find((p) => p.id === card.petId);
      if (!pet || !card.art) return null;
      const { fg, plate } = await depthLayers(card.art.replace("/api/art/", "").replace(/\?.*$/, ""), samPhrase(pet.species));
      return { id: card.id, fg: fg ? `/api/art/${fg}?v=${v}` : null, plate: plate ? `/api/art/${plate}?v=${v}` : null };
    }),
  );
  await update((f) => {
    for (const d of done) {
      const c = d && f.cards.find((x) => x.id === d.id);
      if (c && d.plate) Object.assign(c, { fg: d.fg, plate: d.plate });
    }
  });
  const after = await load();
  return NextResponse.json({ fixed: done.filter((d) => d?.plate).length, left: after.cards.filter(needs).length });
});
