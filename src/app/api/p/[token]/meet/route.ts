import { NextResponse } from "next/server";
import { petContext } from "@/lib/ask";
import { overLimit } from "@/lib/limits";
import { getMedia, putMedia } from "@/lib/media";
import { LIVE, playReport, twinTurn, withProviders } from "@/lib/meta";
import { currentUserId, runAs, withUser } from "@/lib/session";
import { openShare, sharedContext } from "@/lib/shares";
import { packFor, type Pattern } from "@/lib/species";
import { load, newId, update } from "@/lib/store";
import type { Pet, Playdate, PlayReport, State } from "@/lib/types";

export const maxDuration = 300;

// What a visiting pet brings to a playdate: play, others, walks and trips.
const PLAY: Pattern[] = ["ball", "circles", "path", "wind"];

function playContext(state: State, pet: Pet) {
  const ctx = petContext(state, pet);
  const slots = packFor(pet.species).quest;
  const keep = new Set(
    ctx.cards.filter((c) => PLAY.includes((c.pattern ?? slots.find((s) => s.id === c.slotId)?.pattern) as Pattern)).map((c) => c.id),
  );
  return { ...ctx, imprints: ctx.imprints.filter((i) => keep.has(i.id)) };
}

// Copy the other pet's face into this owner's storage, so each owner's record shows both pets: its character, or
// before it has one, the AI's painting of it (never a photo).
const faceOf = (p: Pet) => p.character?.moods.idle?.[0] ?? p.likeness?.file;
async function copyFace(fromOwner: string, frame: string | undefined, toOwner: string) {
  if (!frame) return null;
  try {
    const data = await runAs(fromOwner, () => getMedia(frame));
    return await runAs(toOwner, () => putMedia(`${newId("art")}-friend.png`, data));
  } catch {
    return null;
  }
}

const flip = (r: PlayReport): PlayReport => ({ ...r, reasons: r.reasons.map((x) => ({ ...x, pet: x.pet === "me" ? "them" : "me" })) });

// Two twins meet before their pets do: the invite's pet (its owner chose what it shares) and the visitor's pet.
export const POST = withUser(async (_req: Request, ctx: { params: Promise<{ token: string }> }) => {
  if (!LIVE) return NextResponse.json({ error: "playdates need live mode" }, { status: 400 });
  const limited = await overLimit("ask");
  if (limited) return limited;
  const { token } = await ctx.params;
  const host = await openShare(token, "playdate");
  if (!host) return NextResponse.json({ error: "This invite is no longer active." }, { status: 404 });
  const me = currentUserId();
  if (host.ownerId === me) return NextResponse.json({ error: "That's your own invite. Send it to another pet's owner." }, { status: 400 });
  const mine = await load();
  const guest = mine.pets.find((p) => p.name);
  if (!guest) return NextResponse.json({ error: "Add your pet first, then come back to this invite." }, { status: 400 });

  const A = sharedContext(host); // the host pet, limited to what its owner shared
  const B = playContext(mine, guest);
  const transcript: { who: "host" | "guest"; line: string; mood: string }[] = [];
  const named = () => transcript.map((t) => ({ who: t.who === "host" ? host.pet.name : guest.name, line: t.line }));
  const { result: report, open } = await withProviders(async () => {
    for (let i = 0; i < 4; i++) {
      const hostTurn = i % 2 === 0;
      const t = hostTurn
        ? await runAs(host.ownerId, () => twinTurn({ profile: A.profile, imprints: A.imprints }, guest.name, named(), i === 0))
        : await twinTurn({ profile: B.profile, imprints: B.imprints }, host.pet.name, named(), false);
      transcript.push({ who: hostTurn ? "host" : "guest", line: t.line, mood: t.mood });
    }
    return playReport({ name: host.pet.name, imprints: A.imprints }, { name: guest.name, imprints: B.imprints }, named());
  });
  // only real cards count as evidence, each checked against its own pet
  report.reasons = report.reasons.map((r) => ({ ...r, cardIds: r.cardIds.filter((id) => (r.pet === "me" ? A.cards : B.cards).some((c) => c.id === id)) }));

  const now = new Date().toISOString();
  const hostFace = await copyFace(host.ownerId, faceOf(host.pet), me);
  const guestFace = await copyFace(me, faceOf(guest), host.ownerId);
  const forGuest: Playdate = {
    id: newId("pd"),
    petId: guest.id,
    other: { name: host.pet.name, species: host.pet.species, breed: host.pet.breed, face: hostFace },
    transcript: transcript.map((t) => ({ who: t.who === "guest" ? "me" : "them", line: t.line, mood: t.mood })),
    report: flip(report),
    at: now,
    openWeights: open,
  };
  const forHost: Playdate = {
    id: newId("pd"),
    petId: host.pet.id,
    other: { name: guest.name, species: guest.species, breed: guest.breed, face: guestFace },
    transcript: transcript.map((t) => ({ who: t.who === "host" ? "me" : "them", line: t.line, mood: t.mood })),
    report,
    at: now,
    openWeights: open,
  };
  await update((s) => {
    s.playdates ??= [];
    s.playdates.push(forGuest);
  });
  await runAs(host.ownerId, () =>
    update((s) => {
      s.playdates ??= [];
      s.playdates.push(forHost);
    }),
  );
  return NextResponse.json({ playdate: forGuest });
});
