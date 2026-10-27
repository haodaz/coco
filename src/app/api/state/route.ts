import { NextResponse } from "next/server";
import { clarityOf, levelName } from "@/lib/memory";
import { LIVE } from "@/lib/meta";
import { load } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await load();
  const memory = Object.fromEntries(s.pets.map((p) => { const c = clarityOf(s, p); return [p.id, { ...c, name: levelName(c.level, p) }]; }));
  return NextResponse.json({ ...s, memory, live: LIVE });
}
