import { NextResponse } from "next/server";
import { servicesNear } from "@/lib/place";
import { load, update } from "@/lib/store";
import { withUser } from "@/lib/session";

export const maxDuration = 60;

// Look up pet places around the area again (OpenStreetMap). Names and hours only.
export const POST = withUser(async () => {
  const s = await load();
  if (!s.place) return NextResponse.json({ error: "Tell us where you live first." }, { status: 400 });
  const items = await servicesNear(s.place);
  if (!items) return NextResponse.json({ error: "The map service is busy. Try again in a minute." }, { status: 503 });
  const checkedAt = new Date().toISOString();
  await update((f) => {
    if (f.place) f.place.services = { items: items.slice(0, 120), checkedAt };
  });
  return NextResponse.json({ ok: true, count: items.length });
});
