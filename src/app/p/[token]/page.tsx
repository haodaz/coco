"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Character from "@/components/Character";
import PlaydateView from "@/components/PlaydateView";
import type { Playdate } from "@/lib/types";
import { PageLoading } from "@/components/Loading";
import { CocoLogo } from "@/components/Brand";

type Info = { pet: { name: string; species: string; breed: string | null }; label: string; moods: Record<string, string[]> };

// A playdate invite: another pet's owner opens it, signs in with their pet, and the two twins meet first.
export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  const [me, setMe] = useState<{ name: string; face: string | null } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Playdate | null>(null);
  useEffect(() => {
    fetch(`/api/p/${token}`).then(async (r) => (r.ok ? setInfo(await r.json()) : setErr((await r.json()).error)));
    fetch("/api/state").then(async (r) => {
      if (!r.ok) return setMe(null);
      const s = await r.json();
      const pet = s.pets?.find((p: { name: string }) => p.name);
      const idle = pet?.character?.moods?.idle?.[0];
      // your own pet: its character, or its photo until it has one
      setMe(pet ? { name: pet.name, face: idle ? `/api/art/${idle}` : pet.avatarPhotoId ? `/api/photos/${pet.avatarPhotoId}` : null } : null);
    });
  }, [token]);

  async function meet() {
    setBusy(true);
    const r = await fetch(`/api/p/${token}/meet`, { method: "POST" });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return alert(j.error);
    setResult(j.playdate);
  }

  if (err) return <main className="ws grid place-items-center p-8 text-center"><div><div className="serif text-[28px] font-bold">This invite is switched off.</div><p className="mt-2 text-[var(--ink2)]">Ask the pet&apos;s owner for a new one.</p></div></main>;
  if (!info) return <PageLoading label="" />;
  const host = info.pet;
  return (
    <main className="ws block min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <Link href="/"><CocoLogo size={20} /></Link>
        {!result ? (
          <div className="mt-8 grid items-center gap-8 md:grid-cols-[minmax(0,300px)_1fr]">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[260px]">{info.moods.idle?.length ? <Character moods={info.moods} mood={busy ? "thinking" : "happy"} className="h-full w-full" /> : null}</div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">Playdate invite</div>
              <h1 className="serif mt-2 text-[36px] font-bold leading-tight">{host.name} would like to meet your pet.</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink2)]">
                Before they meet in person, their twins talk first: each speaks only from its own real moments, then you both get an honest note on whether they&apos;d get on. Your pet shares only its play, walks, trips and how it is with others.
              </p>
              {me === undefined ? null : me ? (
                <button disabled={busy} onClick={meet} className="mt-6 rounded-xl bg-[var(--ink)] px-5 py-3 text-[15px] font-semibold text-white disabled:opacity-60">
                  {busy ? `${host.name} and ${me.name} are talking… about a minute` : `Let ${host.name} and ${me.name} meet`}
                </button>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(`/p/${token}`)}`} className="mt-6 inline-block rounded-xl bg-[var(--ink)] px-5 py-3 text-[15px] font-semibold text-white">Sign in to bring your pet</Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="serif text-[32px] font-bold">{me?.name} & {host.name}</h1>
            <p className="mt-1 text-[14px] text-[var(--ink2)]">You&apos;ll also find this under Friends in your coco.</p>
            <div className="mt-6">
              <PlaydateView p={result} petName={me?.name ?? "Your pet"} myFace={me?.face ?? null} otherFace={result.other.face ? `/api/art/${result.other.face}` : null} />
            </div>
            <Link href="/app/friends" className="mt-6 inline-block rounded-xl bg-[var(--ink)] px-5 py-3 text-[14px] font-semibold text-white">Go to Friends</Link>
          </div>
        )}
      </div>
    </main>
  );
}
