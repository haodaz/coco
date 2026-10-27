import { NextResponse } from "next/server";
import { findAreas } from "@/lib/place";
import { withUser } from "@/lib/session";

// Towns matching what the owner typed, to pick from.
export const GET = withUser(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ areas: [] });
  return NextResponse.json({ areas: await findAreas(q) });
});
