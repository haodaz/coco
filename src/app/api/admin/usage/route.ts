import { NextResponse } from "next/server";
import { isAdmin, withUser } from "@/lib/session";
import { adminClient, HOSTED } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// For admins only: what the site used today and over the last week, by feature and by person.
export const GET = withUser(async () => {
  if (!isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  if (!HOSTED) return NextResponse.json({ error: "usage is only kept in hosted mode" }, { status: 400 });
  const db = adminClient();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: rows, error } = await db.from("usage_log").select("user_id, at, feature, model, usage").gte("at", since).order("at", { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = new Map<string, string>();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of users?.users ?? []) emails.set(u.id, u.email ?? u.id);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tokens = (u: unknown) => {
    const x = (u ?? {}) as Record<string, number>;
    return Number(x.total_tokens ?? 0) || Number(x.input_tokens ?? 0) + Number(x.output_tokens ?? 0);
  };
  const days: Record<string, { calls: number; tokens: number }> = {};
  const features: Record<string, { calls: number; tokens: number }> = {};
  const people: Record<string, { calls: number; tokens: number }> = {};
  for (const r of rows ?? []) {
    const d = r.at.slice(0, 10);
    (days[d] ??= { calls: 0, tokens: 0 }).calls++;
    days[d].tokens += tokens(r.usage);
    if (new Date(r.at) >= today) {
      (features[r.feature] ??= { calls: 0, tokens: 0 }).calls++;
      features[r.feature].tokens += tokens(r.usage);
      const who = emails.get(r.user_id) ?? r.user_id;
      (people[who] ??= { calls: 0, tokens: 0 }).calls++;
      people[who].tokens += tokens(r.usage);
    }
  }
  const PAINTINGS = ["card-art", "likeness-profile", "likeness-imprints", "character", "character-frame", "soul-art"];
  const paintingsToday = Object.entries(features).filter(([f]) => PAINTINGS.includes(f)).reduce((n, [, v]) => n + v.calls, 0);
  return NextResponse.json({ days, features, people, paintingsToday, paintingCap: Number(process.env.SITE_PAINTINGS_PER_DAY ?? 500), accounts: emails.size });
});
