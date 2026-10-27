import { NextResponse } from "next/server";
import { currentUserId } from "./session";
import { adminClient, HOSTED } from "./supabase";

// Fair use, counted from the usage log: a few things per person per day, and a site-wide cap on paintings,
// so the model budget can't be drained. Local mode has no limits.

const PER_DAY: Record<string, { features: string[]; max: number; what: string }> = {
  pet: { features: ["identify"], max: 10, what: "new pets" },
  quest: { features: ["quest-photo"], max: 30, what: "starter pack photos" },
  note: { features: ["owner-note"], max: 50, what: "notes" },
  ask: { features: ["ask"], max: 60, what: "questions" },
  character: { features: ["character"], max: 12, what: "character drawings" }, // one drawing = 6 calls
  legend: { features: ["soul"], max: 3, what: "soul portraits" },
};
const PAINTINGS = ["card-art", "likeness-profile", "likeness-imprints", "character", "character-frame", "soul-art"];
const SITE_PAINTINGS = Number(process.env.SITE_PAINTINGS_PER_DAY ?? 500);

const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

// Returns a response to send instead when over a limit, or null to go ahead.
export async function overLimit(kind: keyof typeof PER_DAY, paints = false): Promise<Response | null> {
  if (!HOSTED) return null;
  const db = adminClient();
  const rule = PER_DAY[kind];
  const mine = await db.from("usage_log").select("id", { count: "exact", head: true }).eq("user_id", currentUserId()).in("feature", rule.features).gte("at", startOfDay());
  if ((mine.count ?? 0) >= rule.max) return NextResponse.json({ error: `That's all the ${rule.what} for today. Come back tomorrow.` }, { status: 429 });
  if (paints) {
    const site = await db.from("usage_log").select("id", { count: "exact", head: true }).in("feature", PAINTINGS).gte("at", startOfDay());
    if ((site.count ?? 0) >= SITE_PAINTINGS) return NextResponse.json({ error: "coco has painted all it can for today. Please come back tomorrow." }, { status: 503 });
  }
  return null;
}
