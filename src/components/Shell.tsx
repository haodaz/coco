"use client";

import { BookHeart, Gift, HeartHandshake, House, Layers, LogOut, MessageCirclePlus, Shield, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import CardModal from "@/components/CardModal";
import Scene from "@/components/Scene";
import UnlockToast from "@/components/UnlockToast";
import type { Memory } from "@/components/MemoryPanel";
import { ConfirmProfile, StartWithOnePhoto } from "@/components/Onboarding";
import { rhythm } from "@/lib/rhythm";
import type { Card, Pet, State } from "@/lib/types";

export type Loaded = State & { live: boolean; signedIn: boolean; admin: boolean; email: string | null; memory: Record<string, Memory> };
export type Ctx = { state: Loaded; pet: Pet; memory: Memory | undefined; refresh: () => Promise<void>; openCard: (c: Card) => void };

// The app as a workspace: a paper sidebar with the pet, a way to start talking, the places to go,
// recent conversations and the account; the page on the right. Any card anywhere opens in the same card view.
export default function Shell({ children }: { children: (ctx: Ctx) => ReactNode }) {
  return (
    <Suspense>
      <Workspace>{children}</Workspace>
    </Suspense>
  );
}

function Workspace({ children }: { children: (ctx: Ctx) => ReactNode }) {
  const [state, setState] = useState<Loaded | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const refresh = useCallback(async () => {
    const r = await fetch("/api/state");
    if (r.status === 401) return void location.assign(`/login?next=${encodeURIComponent(location.pathname)}`);
    setState(await r.json());
  }, []);
  useEffect(() => {
    refresh();
    const again = () => refresh();
    window.addEventListener("coco-refresh", again); // pages ask the shell to reload after they change something
    return () => window.removeEventListener("coco-refresh", again);
  }, [refresh]);
  const path = usePathname();
  const params = useSearchParams();

  if (!state) return <main className="ws grid place-items-center text-[var(--ink3)]">Loading…</main>;
  const pet = state.pets[0];
  const banner = !state.live && (
    <div className="mb-4 rounded-lg bg-[#fff7e6] px-3 py-2 text-[12px] text-[#ad6800]">Practice mode: the AI answers are samples. No request goes to the Meta API until live mode is on.</div>
  );
  if (!pet || !pet.name)
    return (
      <main className="ws block px-4 pb-24 pt-8">
        <div className="mx-auto max-w-5xl">
          {banner}
          {!pet ? <StartWithOnePhoto onDone={refresh} /> : <ConfirmProfile pet={pet} onDone={refresh} />}
        </div>
      </main>
    );

  const cards = state.cards.filter((c) => c.petId === pet.id);
  const r = rhythm(cards);
  const memory = state.memory?.[pet.id];
  const threads = (state.threads ?? []).filter((t) => t.petId === pet.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const thread = params.get("thread");
  const face = pet.character?.moods.idle?.[0];
  const faceSrc = face ? (face.startsWith("/") ? face : `/api/art/${face}?v=${encodeURIComponent(pet.character?.at ?? "")}`) : "";
  const NAV: { href: string; label: string; icon: LucideIcon; badge?: string; on: boolean }[] = [
    { href: "/app", label: "Home", icon: House, on: path === "/app" },
    { href: "/app/pack", label: "Today's pack", icon: Gift, badge: r.left ? `${r.left}` : undefined, on: path.startsWith("/app/pack") },
    { href: "/app/cards", label: "Cards", icon: Layers, badge: `${cards.length}`, on: path.startsWith("/app/cards") },
    { href: "/app/memory", label: "Memory", icon: BookHeart, badge: memory ? `Lv ${memory.level}` : undefined, on: path.startsWith("/app/memory") },
    { href: "/app/friends", label: "Friends", icon: HeartHandshake, badge: (state.playdates ?? []).filter((p) => p.petId === pet.id).length ? `${(state.playdates ?? []).filter((p) => p.petId === pet.id).length}` : undefined, on: path.startsWith("/app/friends") },
  ];
  if (state.admin) NAV.push({ href: "/app/admin", label: "Admin", icon: Shield, on: path.startsWith("/app/admin") });

  return (
    <div className="ws">
      <aside className="ws-side">
        <div className="flex items-center gap-2 px-5 pb-3 pt-5">
          <Link href="/" className="serif text-[24px] font-bold tracking-tight">coco</Link>
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">Memory Prints</span>
        </div>

        <Link href="/app" className="ws-hide-sm mx-3 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-2.5 pr-3">
          {/* the pet sits in its circle and pokes its head out over the top, breaking out of the paper */}
          <span className="relative mt-3 h-14 w-14 shrink-0">
            <span className="absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_30%,#fff,#ebe5fb)]" style={{ boxShadow: "0 0 0 2px #fff, 0 0 0 4px rgba(109,79,209,.45)" }}>
              {face ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={faceSrc} alt="" className="absolute -bottom-[83px] left-1/2 w-[234%] max-w-none -translate-x-1/2" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/photos/${pet.avatarPhotoId}`} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            {face && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faceSrc} alt="" className="pointer-events-none absolute -bottom-[83px] left-1/2 w-[234%] max-w-none -translate-x-1/2 drop-shadow-[0_2px_3px_rgba(35,32,27,.18)]" style={{ clipPath: "inset(0 0 62% 0)" }} />
            )}
          </span>
          <span className="min-w-0">
            <b className="serif block truncate text-[17px] leading-tight">{pet.name}</b>
            <span className="block truncate text-[12px] text-[var(--ink2)]">{memory?.name ?? pet.breed ?? pet.species}</span>
            {memory && (
              <span className="mt-1 block h-1 w-28 overflow-hidden rounded-full bg-[var(--line)]">
                <span className="block h-full rounded-full bg-[var(--gold)]" style={{ width: `${memory.next ? Math.round(((memory.points - memory.floor) / (memory.next - memory.floor)) * 100) : 100}%` }} />
              </span>
            )}
          </span>
        </Link>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
          <Link href="/app/chat" className="ws-hide-sm mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-[14.5px] font-bold hover:border-[var(--gold)]">
            <MessageCirclePlus size={17} strokeWidth={1.7} className="text-[var(--gold)]" />
            Talk with {pet.name}
          </Link>
          <nav className="ws-nav grid gap-0.5">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={n.on ? "on" : ""}>
                <span className="ic"><n.icon size={17} strokeWidth={1.7} /></span>
                {n.label}
                {n.badge && <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${n.href === "/app/pack" ? "bg-[var(--gold)] text-white" : "bg-[#eeebf8] text-[var(--ink2)]"}`}>{n.badge}</span>}
              </Link>
            ))}
          </nav>

          <div className="ws-hide-sm">
            <div className="ws-group">Recent</div>
            {threads.slice(0, 24).map((t) => (
              <Link key={t.id} href={`/app/chat?thread=${t.id}`} className={`ws-item ${path.startsWith("/app/chat") && thread === t.id ? "on" : ""}`} title={t.title}>
                {t.title}
              </Link>
            ))}
            {!threads.length && <div className="px-3 text-[13px] text-[var(--ink3)]">No conversations yet</div>}
          </div>
        </div>

        <div className="ws-hide-sm border-t border-[var(--line)] p-3">
          {r.streak > 0 && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-[#f3eefe] px-3 py-2 text-[12.5px] text-[#5b3fb0]">
              <Sparkles size={14} />
              <span><b>{r.streak}</b> day{r.streak > 1 ? "s" : ""} in a row with a new memory</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-1 text-[12.5px] text-[var(--ink2)]">
            <span className="min-w-0 flex-1 truncate">{state.email ?? "Local mode"}</span>
            {state.signedIn && (
              <button
                title="Sign out"
                onClick={async () => {
                  const { browserClient } = await import("@/lib/supabase-browser");
                  await browserClient().auth.signOut();
                  location.assign("/");
                }}
                className="rounded-lg p-1.5 hover:bg-[rgba(35,32,27,.06)]"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="ws-main">
        <div className="ws-wrap">
          {banner}
          {children({ state, pet, memory, refresh, openCard: setCard })}
        </div>
      </main>
      {card && <CardModal card={card} state={state} pet={pet} onClose={() => setCard(null)} onChanged={refresh} />}
      <UnlockToast pet={pet} />
    </div>
  );
}

// A page title in the workspace: a small eyebrow, a serif headline with an italic line, a lead, and art behind on the right.
export function PageHead({ eyebrow, title, sub, lead, art, portrait, children }: { eyebrow: string; title: ReactNode; sub?: string; lead?: ReactNode; art?: string; portrait?: string; children?: ReactNode }) {
  return (
    <header className="ws-head">
      {art && <div className="ws-head-art"><Scene name={art} portrait={portrait} /></div>}
      <div className="relative max-w-2xl md:max-w-[60%]">
        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">{eyebrow}</div>
        <h1 className="serif mt-2 text-[34px] font-bold leading-[1.1] tracking-tight md:text-[42px]">{title}</h1>
        {sub && <div className="serif mt-1 text-[17px] italic text-[var(--ink2)]">{sub}</div>}
        {lead && <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink2)]">{lead}</p>}
      </div>
      {children && <div className="relative ml-auto">{children}</div>}
    </header>
  );
}

export function Rule({ label }: { label: string }) {
  return <div className="ws-rule"><i /><span>✦ {label} ✦</span><i /></div>;
}
