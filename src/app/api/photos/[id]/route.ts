import { readPhoto } from "@/lib/photos";
import { load } from "@/lib/store";
import { withUser } from "@/lib/session";

export const GET = withUser(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const photo = (await load()).photos.find((p) => p.id === id);
  if (!photo) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(await readPhoto(photo.file)), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
});
