import { NextResponse } from "next/server";
import { LANGS } from "@/lib/i18n";
import { update } from "@/lib/store";
import { withUser } from "@/lib/session";

// The owner's settings. For now: their language, which the app's words and everything the AI writes follow.
export const POST = withUser(async (req: Request) => {
  const { lang } = (await req.json()) as { lang?: string };
  if (!lang || !LANGS.some((l) => l.code === lang)) return NextResponse.json({ error: "unknown language" }, { status: 400 });
  await update((s) => {
    s.settings = { ...s.settings, lang };
  });
  return NextResponse.json({ ok: true });
});
