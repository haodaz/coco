"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Memory } from "@/components/MemoryPanel";
import { ConfirmProfile, StartWithOnePhoto } from "@/components/Onboarding";
import type { Pet, State } from "@/lib/types";

export type Loaded = State & { live: boolean; memory: Record<string, Memory> };
export type Ctx = { state: Loaded; pet: Pet; memory: Memory | undefined; refresh: () => Promise<void> };

const TABS = [
  { href: "/", label: (name: string) => name },
  { href: "/cards", label: () => "Cards" },
  { href: "/memory", label: () => "Memory" },
];

// Every page: load the state, run onboarding until there is a named pet, then show the tabs and the page.
export default function Shell({ children }: { children: (ctx: Ctx) => ReactNode }) {
  const [state, setState] = useState<Loaded | null>(null);
  const refresh = useCallback(async () => setState(await (await fetch("/api/state")).json()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const path = usePathname();

  if (!state) return <main className="p-10 text-[var(--sub)]">Loading…</main>;
  const pet = state.pets[0];
  const banner = !state.live && (
    <div className="mb-4 rounded-lg bg-[#fff7e6] px-3 py-2 text-[12px] text-[#ad6800]">Practice mode: the AI answers are samples. No request goes to the Meta API until live mode is on.</div>
  );
  if (!pet || !pet.name)
    return (
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
        {banner}
        {!pet ? <StartWithOnePhoto onDone={refresh} /> : <ConfirmProfile pet={pet} onDone={refresh} />}
      </main>
    );

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2.5">
          <span className="mr-3 text-[15px] font-bold tracking-tight">coco</span>
          {TABS.map((t) => {
            const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href} className={`rounded-full px-3.5 py-1.5 text-[14px] font-medium transition ${on ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--sub)] hover:text-[var(--ink)]"}`}>
                {t.label(pet.name)}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        {banner}
        {children({ state, pet, memory: state.memory?.[pet.id], refresh })}
      </main>
    </>
  );
}
