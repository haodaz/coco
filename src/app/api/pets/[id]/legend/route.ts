import { NextResponse } from "next/server";
import { petContext } from "@/lib/ask";
import { samPhrase } from "@/lib/finish";
import { depthLayers, LIVE, paintSoul, readSoul, writeIn } from "@/lib/meta";
import { photoBase64 } from "@/lib/photos";
import { packFor } from "@/lib/species";
import { load, newId, update } from "@/lib/store";
import type { Card } from "@/lib/types";
import { withUser } from "@/lib/session";
import { overLimit } from "@/lib/limits";

export const maxDuration = 300; // seconds; model calls and painting take a while

// The soul portrait: unlocked when the starter set is full. The pet says who it is from all its imprints,
// and its legendary card is painted so the pet can step out of the frame.
export const POST = withUser(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const limited = await overLimit("legend", true);
  if (limited) return limited;
  const { id } = await ctx.params;
  if (!LIVE) return NextResponse.json({ error: "the soul portrait needs live mode" }, { status: 400 });
  const s = await load();
  const pet = s.pets.find((p) => p.id === id);
  if (!pet) return NextResponse.json({ error: "pet not found" }, { status: 404 });
  const slots = packFor(pet.species).quest;
  const quest = s.cards.filter((c) => c.petId === pet.id && c.kind === "quest");
  if (slots.some((sl) => !quest.some((c) => c.slotId === sl.id))) return NextResponse.json({ error: "finish the starter set first" }, { status: 400 });

  const { cards, imprints, profile } = petContext(s, pet);
  writeIn(s.settings?.lang);
  const soul = await readSoul(profile, imprints);
  const basis = soul.basis.filter((b) => cards.some((c) => c.id === b)); // only real cards count as evidence

  // its clearest moments as reference: the avatar, then the rarest cards
  const photoIds = [...new Set([pet.avatarPhotoId, ...[...quest].sort((a, b) => b.rarity - a.rarity).map((c) => c.photoId)].filter(Boolean) as string[])].slice(0, 4);
  const refs = await Promise.all(photoIds.map((pid) => photoBase64(s.photos.find((p) => p.id === pid)!.file)));
  const art = await paintSoul(pet, refs, soul.scene);
  const { fg, plate } = await depthLayers(art, samPhrase(pet.species));

  const card: Card = {
    id: newId("card"),
    petId: pet.id,
    kind: "legendary",
    slotId: null,
    pattern: null,
    name: soul.name,
    rarity: 3,
    style: "Legend",
    art: `/api/art/${art}`,
    fg: fg ? `/api/art/${fg}` : null,
    plate: plate ? `/api/art/${plate}` : null,
    layersV: plate ? 2 : undefined,
    line: soul.line,
    observation: soul.essence.join(" · "),
    basis,
    photoId: pet.avatarPhotoId ?? quest[0].photoId,
    createdAt: new Date().toISOString(),
  };
  // the minute of painting may have changed the state; write onto a fresh copy, one legend per pet
  await update((fresh) => {
    fresh.cards = fresh.cards.filter((c) => !(c.petId === pet.id && c.kind === "legendary"));
    fresh.cards.push(card);
  });
  return NextResponse.json({ card });
});
