import { readPhoto } from "@/lib/photos";

// Generated card art, stored next to the photos.
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!/^art_[\w-]+\.(jpg|png)$/.test(file)) return new Response("not found", { status: 404 });
  try {
    return new Response(new Uint8Array(await readPhoto(file)), { headers: { "Content-Type": file.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "private, max-age=86400" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
