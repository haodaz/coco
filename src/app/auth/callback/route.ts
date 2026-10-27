import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/supabase";

// The sign-in link lands here: trade its one-time code for a session, then go on into the app.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app";
  const to = next.startsWith("/") && !next.startsWith("//") ? next : "/app"; // only ever back into this site
  if (code) {
    const { error } = await (await sessionClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(to, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
