"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CocoLogo } from "@/components/Brand";
import HoloCard from "@/components/HoloCard";
import { PageLoading } from "@/components/Loading";
import { finishFor } from "@/lib/finish";

type Info = {
  kind: "card" | "pet";
  pet: { name: string; species: string; breed: string | null; sex: string | null; face: string | null };
  counts: { prints: number; legends: number };
  cards: { id: string; name: string; line: string; rarity: 1 | 2 | 3; style: string; kind: string; art: string | null; fg: string | null; plate: string | null }[];
};

// A card, or a pet's universe, shown to anyone with the link: made to be passed around, with a way in for the reader.
export default function PublicShare({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`/api/x/${token}`).then(async (r) => (r.ok ? setInfo(await r.json()) : setErr((await r.json()).error)));
  }, [token]);
  if (err) return <main className="ws min-h-[100dvh] place-items-center p-8 text-center" style={{ display: "grid" }}><div><div className="serif text-[28px] font-bold">This link is switched off.</div><p className="mt-2 text-[var(--ink2)]">The owner may have taken it down.</p><Link href="/" className="mt-5 inline-block rounded-xl bg-[var(--primary)] px-5 py-3 text-[15px] font-semibold text-white">What is cocoverse?</Link></div></main>;
  if (!info) return <PageLoading label="" />;
  const { pet } = info;
  const her = pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their";
  const cta = (
    <div className="mt-8 flex flex-col items-center gap-2">
      <Link href="/" className="rounded-xl bg-[var(--primary)] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(109,79,209,.55)]">Start your own cocoverse →</Link>
      <span className="text-[12.5px] text-[var(--ink3)]">Every photo becomes a card. Your pet&apos;s AI grows only from them.</span>
    </div>
  );

  if (info.kind === "card") {
    const c = info.cards[0];
    return (
      <main className="ws min-h-[100dvh] bg-[linear-gradient(180deg,#f1edff_0%,var(--bg)_60%)] px-5 pb-16 pt-5" style={{ flexDirection: "column" }}>
        <header className="mx-auto flex max-w-3xl items-center gap-3"><CocoLogo size={20} /></header>
        <div className="mx-auto mt-8 w-full max-w-3xl text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{pet.name}&apos;s memory card</div>
          <h1 className="serif mt-1 text-[32px] font-bold leading-tight md:text-[40px]">{c ? c.name : pet.name}</h1>
          {c && <p className="serif mt-2 text-[18px] italic text-[var(--ink2)]">“{c.line}”</p>}
          {c && (
            <div className={`mx-auto mt-6 w-full max-w-[340px] ${c.kind === "legendary" ? "pt-10" : ""}`}>
              <HoloCard art={c.art ?? ""} fg={c.fg} plate={c.plate} finish={finishFor({ id: c.id, kind: c.kind as never, rarity: c.rarity })} name={c.name} line={c.line} stars={c.rarity} label={`${pet.name} · ${c.style}`} idle />
              <div className="mt-3 text-[12px] text-[var(--ink3)]"><span className="hidden md:inline">Move over the card to turn it in the light</span><span className="md:hidden">Drag across the card to turn it in the light</span></div>
            </div>
          )}
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-[#3d4460]">
            One real moment, painted into a card {pet.name}&apos;s AI keeps as a memory. In cocoverse we keep every moment.
          </p>
          {cta}
        </div>
      </main>
    );
  }

  return (
    <main className="ws min-h-[100dvh] bg-[linear-gradient(180deg,#f1edff_0%,var(--bg)_60%)] px-5 pb-16 pt-5" style={{ flexDirection: "column" }}>
      <header className="mx-auto flex max-w-4xl items-center gap-3"><CocoLogo size={20} /></header>
      <div className="mx-auto mt-6 w-full max-w-4xl text-center">
        {pet.face && (
          <div className="mx-auto aspect-[768/1057] w-[180px] md:w-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pet.face} alt={pet.name} className="h-full w-full object-contain drop-shadow-[0_16px_30px_rgba(40,30,90,.25)]" />
          </div>
        )}
        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{pet.breed ?? pet.species}</div>
        <h1 className="serif mt-1 text-[34px] font-bold leading-tight md:text-[44px]">This is {pet.name}.</h1>
        <p className="serif mt-2 text-[19px] italic text-[var(--ink2)]">In cocoverse we have a universe of our own.</p>
        <p className="mt-3 text-[13.5px] text-[var(--ink3)]">{info.counts.prints} memory cards · {info.counts.legends} legends · {her} AI remembers each one</p>
        {info.cards.length > 0 && (
          <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-2 gap-5 sm:grid-cols-4">
            {info.cards.map((c) => (
              <div key={c.id} className={c.kind === "legendary" ? "pt-6" : ""}>
                <HoloCard art={c.art ?? ""} fg={c.fg} plate={c.plate} finish={finishFor({ id: c.id, kind: c.kind as never, rarity: c.rarity })} name={c.name} line="" stars={c.rarity} label={pet.name} idle={false} />
              </div>
            ))}
          </div>
        )}
        {cta}
      </div>
    </main>
  );
}
