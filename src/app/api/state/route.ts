import { NextResponse } from "next/server";
import { LIVE } from "@/lib/meta";
import { load } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ...(await load()), live: LIVE });
}
