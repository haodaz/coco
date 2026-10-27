import { NextResponse } from "next/server";
import { openShare } from "@/lib/shares";

export const dynamic = "force-dynamic";

// A playdate invite, seen by anyone with the link: whose pet is asking to meet.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const o = await openShare(token, "playdate");
  if (!o) return NextResponse.json({ error: "This invite is no longer active." }, { status: 404 });
  const idle = o.pet.character?.moods.idle ?? [];
  const happy = o.pet.character?.moods.happy ?? [];
  const media = (f: string) => `/api/s/${token}/media/${f}`;
  return NextResponse.json({
    pet: { name: o.pet.name, species: o.pet.species, breed: o.pet.breed, sex: o.pet.sex },
    label: o.share.label,
    moods: { idle: idle.map(media), happy: happy.map(media) },
  });
}
