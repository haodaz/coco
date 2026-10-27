import { NextResponse } from "next/server";
import { clarityOf, levelName } from "@/lib/memory";
import { LIVE } from "@/lib/meta";
import { HOSTED } from "@/lib/supabase";
import { load } from "@/lib/store";
import { withUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = withUser(async () => {
  const s = await load();
  const memory = Object.fromEntries(s.pets.map((p) => { const c = clarityOf(s, p); return [p.id, { ...c, name: levelName(c.level, p) }]; }));
  return NextResponse.json({ ...s, memory, live: LIVE, signedIn: HOSTED });
});
