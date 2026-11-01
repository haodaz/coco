import type { Metadata } from "next";
import PublicShare from "@/components/PublicShare";
import { openShare, publicCards } from "@/lib/shares";

export const dynamic = "force-dynamic";

// One card, shown to anyone with the link.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const o = await openShare(token, "card");
  const c = o ? publicCards(o)[0] : null;
  const title = o && c ? `${c.name} · ${o.pet.name}'s memory card` : "cocoverse";
  const description = c ? `“${c.line}” In cocoverse we keep every moment.` : "A little universe for you and your pet.";
  return { title, description, openGraph: { title, description, type: "article" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function CardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicShare token={token} />;
}
