import { NextResponse } from "next/server";
import { isAdmin, runAs, withUser } from "@/lib/session";
import { load, update } from "@/lib/store";
import { adminClient, HOSTED } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// For admins: one account in full (pets, cards, photos, the owner's words) to review, and two actions:
// take down a card (with its photo, traces and files), or suspend / restore the account.

export const GET = withUser(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  if (!HOSTED) return NextResponse.json({ error: "accounts only exist in hosted mode" }, { status: 400 });
  const { id } = await ctx.params;
  const { data: user } = await adminClient().auth.admin.getUserById(id);
  if (!user?.user) return NextResponse.json({ error: "no such account" }, { status: 404 });
  const s = await runAs(id, load);
  const media = (f: string | null | undefined) => (f ? `/api/admin/media/${id}/${f.replace("/api/art/", "").replace(/\?.*$/, "")}` : null);
  return NextResponse.json({
    account: { id, email: user.user.email, createdAt: user.user.created_at, lastSignIn: user.user.last_sign_in_at, banned: !!user.user.banned_until && new Date(user.user.banned_until) > new Date() },
    pets: s.pets.map((p) => ({ id: p.id, name: p.name, species: p.species, breed: p.breed, born: p.born, sex: p.sex, avatar: media(s.photos.find((x) => x.id === p.avatarPhotoId)?.file) })),
    cards: s.cards
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        name: c.name,
        line: c.line,
        observation: c.observation,
        note: c.note?.text ?? null,
        art: media(c.art),
        photo: media(s.photos.find((x) => x.id === c.photoId)?.file),
        facesBlurred: s.photos.find((x) => x.id === c.photoId)?.facesBlurred ?? 0,
        createdAt: c.createdAt,
      })),
  });
});

export const POST = withUser(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  const { id } = await ctx.params;
  const { action, cardId } = (await req.json()) as { action: string; cardId?: string };
  const db = adminClient();

  if (action === "suspend" || action === "restore") {
    const { error } = await db.auth.admin.updateUserById(id, { ban_duration: action === "suspend" ? "876000h" : "none" });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }

  if (action === "remove-card" && cardId) {
    const gone: string[] = [];
    await runAs(id, () =>
      update((s) => {
        const card = s.cards.find((c) => c.id === cardId);
        if (!card) return;
        const photo = s.photos.find((p) => p.id === card.photoId);
        // the photo goes too unless another card or a pet's avatar still uses it
        const photoInUse = s.cards.some((c) => c.id !== card.id && c.photoId === card.photoId) || s.pets.some((p) => p.avatarPhotoId === card.photoId);
        s.cards = s.cards.filter((c) => c.id !== card.id);
        s.traces = s.traces.filter((t) => !(t.source.type === "note" && t.source.noteId === card.id) && !(!photoInUse && t.source.type === "photo" && t.source.photoId === card.photoId));
        if (photo && !photoInUse) s.photos = s.photos.filter((p) => p.id !== photo.id);
        gone.length = 0;
        for (const u of [card.art, card.fg, !photoInUse ? photo?.file : null]) if (u) gone.push(u.replace("/api/art/", "").replace(/\?.*$/, ""));
      }),
    );
    if (gone.length) await db.storage.from("media").remove(gone.map((f) => `${id}/${f}`));
    return NextResponse.json({ ok: true, removedFiles: gone.length });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
});
