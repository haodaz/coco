import { getMedia, mediaType } from "@/lib/media";
import { runAs } from "@/lib/session";
import { openShare, sharedFiles } from "@/lib/shares";

// Pictures for a sitter's link: only the character and the shared cards, never a photo.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string; file: string }> }) {
  const { token, file } = await ctx.params;
  const o = (await openShare(token, "sitter")) ?? (await openShare(token, "playdate"));
  if (!o || !sharedFiles(o).has(file)) return new Response("not found", { status: 404 });
  try {
    const data = await runAs(o.ownerId, () => getMedia(file));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": mediaType(file), "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
