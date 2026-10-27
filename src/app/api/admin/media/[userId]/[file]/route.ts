import { NextResponse } from "next/server";
import { getMedia, mediaType } from "@/lib/media";
import { isAdmin, runAs, withUser } from "@/lib/session";

// For admins reviewing an account: any of its photos or paintings.
export const GET = withUser(async (_req: Request, ctx: { params: Promise<{ userId: string; file: string }> }) => {
  if (!isAdmin()) return NextResponse.json({ error: "admins only" }, { status: 403 });
  const { userId, file } = await ctx.params;
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(file)) return new Response("not found", { status: 404 });
  try {
    const data = await runAs(userId, () => getMedia(file));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": mediaType(file), "Cache-Control": "private, max-age=600" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
});
