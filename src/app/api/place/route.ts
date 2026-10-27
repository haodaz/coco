import { NextResponse } from "next/server";
import { findAreas, type Place } from "@/lib/place";
import { placeFacts } from "@/lib/rules";
import { load, update } from "@/lib/store";
import { withUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Where the two of you live, and what is true around you right now (checked on every visit).
export const GET = withUser(async () => {
  const s = await load();
  const pet = s.pets[0];
  return NextResponse.json(await placeFacts(s.place, pet?.name ?? "your pet"));
});

// Set the area (picked from a search, so it is always a real town's centre) and what the owner tells about home.
export const POST = withUser(async (req: Request) => {
  const b = (await req.json()) as { area?: string; pick?: number; home?: Partial<Place["home"]>; clear?: boolean };
  if (b.clear) {
    await update((s) => void (s.place = null));
    return NextResponse.json({ ok: true });
  }
  let area: Awaited<ReturnType<typeof findAreas>>[number] | undefined;
  if (b.area) {
    area = (await findAreas(b.area))[b.pick ?? 0];
    if (!area) return NextResponse.json({ error: "We couldn't find that place." }, { status: 404 });
  }
  const now = new Date().toISOString();
  await update((s) => {
    const prev = s.place;
    if (!area && !prev) return;
    const home = { type: null, yard: null, rules: null, ...prev?.home, ...b.home };
    if (typeof home.rules === "string") home.rules = home.rules.trim().slice(0, 300) || null;
    // a new area means the nearby places must be looked up again
    s.place = area ? { ...area, home, services: prev && prev.lat === area.lat && prev.lon === area.lon ? prev.services : null, setAt: now } : { ...prev!, home, setAt: now };
  });
  return NextResponse.json({ ok: true });
});
