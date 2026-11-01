import { ogImage } from "@/lib/og";

export const alt = "A pet's universe on cocoverse";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return ogImage(token);
}
