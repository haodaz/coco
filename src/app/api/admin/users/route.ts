import { NextResponse } from "next/server";
import { isAdmin, withUser } from "@/lib/session";
import { adminClient, HOSTED } from "@/lib/supabase";
import type { State } from "@/lib/types";

export const dynamic = "force-dynamic";

// For admins: every account, with its pets and how much it has shared, to look after what's on the site.
export const GET = withUser(async () => {
  if (!isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  if (!HOSTED) return NextResponse.json({ error: "accounts only exist in hosted mode" }, { status: 400 });
  const db = adminClient();
  const { data: users, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: rows } = await db.from("app_state").select("user_id, state, updated_at");
  const byUser = new Map((rows ?? []).map((r) => [r.user_id as string, r as { state: State; updated_at: string }]));
  const accounts = users.users.map((u) => {
    const row = byUser.get(u.id);
    const s = row?.state;
    return {
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
      pets: (s?.pets ?? []).map((p) => ({ id: p.id, name: p.name, species: p.species, breed: p.breed })),
      cards: s?.cards.length ?? 0,
      photos: s?.photos.length ?? 0,
      notes: (s?.cards ?? []).filter((c) => c.note?.text).length,
      updatedAt: row?.updated_at ?? null,
    };
  });
  accounts.sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  return NextResponse.json({ accounts });
});
