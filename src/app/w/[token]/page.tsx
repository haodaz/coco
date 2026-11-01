import type { Metadata } from "next";
import PublicShare from "@/components/PublicShare";
import { openShare } from "@/lib/shares";

export const dynamic = "force-dynamic";

// A pet's universe, shown to anyone with the link.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const o = await openShare(token, "pet");
  const title = o ? `This is ${o.pet.name}. · cocoverse` : "cocoverse";
  const description = o ? `In cocoverse we have a universe of our own: ${o.pet.name}'s memory cards, and an AI that remembers each one.` : "A little universe for you and your pet.";
  return { title, description, openGraph: { title, description, type: "profile" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function WorldPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicShare token={token} />;
}
