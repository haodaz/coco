import { after, NextResponse } from "next/server";
import { nextPull } from "@/lib/moves";
import { paintInPool, topUpPool } from "@/lib/painter";
import { balance, PACK_COST, PACK_SIZE, packOpenable, poolReady, sealedPrints, stuckPainting } from "@/lib/points";
import { load, update } from "@/lib/store";
import type { Card } from "@/lib/types";
import { currentUserId, isAdmin, runAs, withUser } from "@/lib/session";

export const maxDuration = 300; // topping the pool up carries on after the answer

const shuffle = <T,>(xs: T[]) => xs.map((x) => ({ x, r: Math.random() })).sort((a, b) => a.r - b.r).map((o) => o.x);

// Open a Daily Booster with M pt. Cards come from the pool, already painted in the background, so the pack opens at
// once: new memories first, then new versions of old ones. A learned move may drop out as a bonus. If the pool is
// still being painted, nothing is spent and the owner is told it will be ready soon.
export const POST = withUser(async (req: Request) => {
  const { petId } = (await req.json()) as { petId?: string };
  const s = await load();
  const pet = s.pets.find((p) => p.id === petId);
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const admin = isAdmin();
  if (!admin && balance(s, pet.id) < PACK_COST) return NextResponse.json({ error: `A pack costs ${PACK_COST} M pt.` }, { status: 400 });
  const owner = currentUserId();

  if (!packOpenable(s, pet.id)) {
    // paint what is waiting (a painting that failed earlier is tried again), or make new versions if the pool is empty
    const stuck = sealedPrints(s, pet.id).filter((c) => !c.art && (!c.painting || stuckPainting(c))).map((c) => c.id);
    after(() => runAs(owner, async () => {
      if (stuck.length) {
        const at = new Date().toISOString();
        await update((f) => { for (const c of f.cards) if (stuck.includes(c.id)) c.painting = at; });
        await paintInPool(pet.id, stuck);
      }
      await topUpPool(pet.id, admin);
    }).catch(() => {}));
    return NextResponse.json({ status: "painting" });
  }

  const pool = poolReady(s, pet.id);
  const picked = [...shuffle(pool.filter((c) => !c.versionOf)), ...shuffle(pool.filter((c) => c.versionOf))].slice(0, PACK_SIZE).map((c) => c.id);
  const now = new Date().toISOString();
  let cards: Card[] = [];
  let bonus: string | null = null;
  await update((f) => {
    const p = f.pets.find((x) => x.id === pet.id)!;
    for (const c of f.cards) if (picked.includes(c.id)) Object.assign(c, { sealed: false, openedAt: now });
    cards = f.cards.filter((c) => picked.includes(c.id));
    if (!admin) (f.points ??= []).push({ petId: pet.id, at: now, delta: -PACK_COST, why: "pack" });
    bonus = nextPull(p, f);
    if (bonus) p.moveCards = [...(p.moveCards ?? []), { mood: bonus, at: now, from: "pack" }];
  });
  // get the next pack ready in the background
  after(() => runAs(owner, () => topUpPool(pet.id, admin)).catch(() => {}));
  return NextResponse.json({ status: "opened", cards, bonus });
});
