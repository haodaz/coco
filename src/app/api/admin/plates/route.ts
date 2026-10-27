import { NextResponse } from "next/server";
import { samPhrase } from "@/lib/finish";
import { depthLayers, recutPetLayer } from "@/lib/meta";
import { load, update } from "@/lib/store";
import { isAdmin, withUser } from "@/lib/session";
import { HOSTED } from "@/lib/supabase";

export const maxDuration = 300;

// Bring the signed-in admin's layered cards up to date, a few at a time: cards without a clean scene get one (one
// painting each) and a pet layer cut from it; cards that have a scene but an old cut get the pet layer cut again
// (no painting). GET says how many are left.
const BATCH = 3;
const needs = (c: { fg?: string | null; plate?: string | null; layersV?: number; art: string | null }) => !!c.fg && !!c.art && (!c.plate || c.layersV !== 2);
const file = (u: string) => u.replace("/api/art/", "").replace(/\?.*$/, "");

export const GET = withUser(async () => {
  if (HOSTED && !isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 }); // local mode is the owner's own machine
  const s = await load();
  return NextResponse.json({ left: s.cards.filter(needs).length });
});

export const POST = withUser(async () => {
  if (HOSTED && !isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 }); // local mode is the owner's own machine
  const s = await load();
  const todo = s.cards.filter(needs).slice(0, BATCH);
  const v = Date.now().toString(36);
  const done = await Promise.all(
    todo.map(async (card) => {
      const pet = s.pets.find((p) => p.id === card.petId);
      if (!pet || !card.art) return null;
      if (card.plate) {
        const fg = await recutPetLayer(file(card.art), file(card.plate), samPhrase(pet.species)).catch(() => null);
        return { id: card.id, fg: fg ? `/api/art/${fg}?v=${v}` : null, plate: card.plate };
      }
      const { fg, plate } = await depthLayers(file(card.art), samPhrase(pet.species));
      return { id: card.id, fg: fg ? `/api/art/${fg}?v=${v}` : null, plate: plate ? `/api/art/${plate}?v=${v}` : null };
    }),
  );
  await update((f) => {
    for (const d of done) {
      const c = d && f.cards.find((x) => x.id === d.id);
      if (c && d.plate && d.fg) Object.assign(c, { fg: d.fg, plate: d.plate, layersV: 2 });
    }
  });
  const after = await load();
  return NextResponse.json({ fixed: done.filter((d) => d?.plate && d?.fg).length, left: after.cards.filter(needs).length });
});
