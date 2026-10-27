import { after, NextResponse } from "next/server";
import { unlockMoves } from "@/lib/character";
import { samPhrase } from "@/lib/finish";
import { refreshLikeness } from "@/lib/likeness";
import { clarityOf } from "@/lib/memory";
import { depthLayer, paintCard } from "@/lib/meta";
import { nextPull } from "@/lib/moves";
import { photoBase64 } from "@/lib/photos";
import { balance, PACK_COST, PACK_SIZE, sealedPrints } from "@/lib/points";
import { load, save } from "@/lib/store";
import { drawStyle } from "@/lib/styles";
import { overLimit } from "@/lib/limits";
import { currentUserId, isAdmin, runAs, withUser } from "@/lib/session";

export const maxDuration = 300; // painting takes a while

// Open a Daily Booster with Memory Points: up to three shared memories (oldest first) are painted into cards, each in
// a style drawn from the blind-box pool; a legend-tier style makes a legend. A move the pet has learned may drop out
// as a bonus card.
export const POST = withUser(async (req: Request) => {
  const limited = await overLimit("quest", true); // the site-wide painting cap
  if (limited && limited.status === 503) return limited;
  const { petId } = (await req.json()) as { petId?: string };
  const s = await load();
  const pet = s.pets.find((p) => p.id === petId);
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const prints = sealedPrints(s, pet.id).slice(0, PACK_SIZE);
  if (!prints.length) return NextResponse.json({ error: "Share a memory first: a pack paints the memories you've shared." }, { status: 400 });
  if (!isAdmin() && balance(s, pet.id) < PACK_COST) return NextResponse.json({ error: `A pack costs ${PACK_COST} M pt.` }, { status: 400 });

  const before = clarityOf(s, pet).level;
  const avatar = s.photos.find((p) => p.id === pet.avatarPhotoId);
  const ref = avatar ? await photoBase64(avatar.file) : null;
  const now = new Date().toISOString();
  await Promise.all(
    prints.map(async (card) => {
      const photo = s.photos.find((p) => p.id === card.photoId);
      if (!photo) return;
      const style = drawStyle();
      const rarity = Math.max(card.rarity, style.tier) as 1 | 2 | 3;
      const art = await paintCard(await photoBase64(photo.file), pet, style.prompt, card.observation, ref);
      const fg = art && rarity >= 2 ? await depthLayer(art, samPhrase(pet.species)).catch(() => null) : null;
      Object.assign(card, { style: style.label, rarity, art: art ? `/api/art/${art}` : null, fg: fg ? `/api/art/${fg}` : null, sealed: false, openedAt: now });
    }),
  );
  if (!isAdmin()) (s.points ??= []).push({ petId: pet.id, at: now, delta: -PACK_COST, why: "pack" });
  const bonus = nextPull(pet, s);
  if (bonus) pet.moveCards = [...(pet.moveCards ?? []), { mood: bonus, at: now, from: "pack" }];
  await refreshLikeness(s, pet).catch(() => false);
  await save(s);
  const owner = currentUserId();
  after(() => runAs(owner, () => unlockMoves(pet.id)).catch(() => {}));
  return NextResponse.json({ cards: prints, bonus, levelBefore: before, levelAfter: clarityOf(s, pet).level, balance: balance(s, pet.id) });
});
