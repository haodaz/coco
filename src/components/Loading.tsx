import { CocoLogo } from "@/components/Brand";

// What shows while the cocoverse loads: three cards from a pack, fanned and taking turns to lift,
// in the pack's own colours. The workspace version keeps the sidebar's shape so nothing jumps when it arrives.

export function CocoLoader({ label = "Opening your cocoverse…", size = "md" }: { label?: string; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-7" : "w-12";
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center">
      <div className={`relative flex items-end justify-center ${size === "sm" ? "h-12" : "h-24"}`}>
        {[-14, 0, 14].map((deg, i) => (
          <span
            key={deg}
            className={`load-card ${w} aspect-[5/7] rounded-[22%/16%] ring-2 ring-white shadow-[0_10px_22px_-10px_rgba(40,30,90,.45)] ${i ? "-ml-3" : ""}`}
            style={{ rotate: `${deg}deg`, animationDelay: `${i * 0.18}s`, zIndex: i === 1 ? 2 : 1 }}
          />
        ))}
      </div>
      {label && <div className={`serif mt-3 italic text-[var(--ink2)] ${size === "sm" ? "text-[13px]" : "text-[16px]"}`}>{label}</div>}
    </div>
  );
}

export function PageLoading({ label }: { label?: string }) {
  return (
    <main className="ws items-center justify-center">
      <CocoLoader label={label} />
    </main>
  );
}

export function WorkspaceLoading() {
  return (
    <div className="ws">
      <aside className="ws-side">
        <div className="flex items-center gap-2 px-5 pb-3 pt-5">
          <CocoLogo size={22} />
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[.2em] text-[var(--gold)]">verse</span>
        </div>
        <div className="ws-hide-sm mx-3 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-2.5">
          <span className="skel h-12 w-12 shrink-0 rounded-full" />
          <span className="grid flex-1 gap-2"><span className="skel h-3.5 w-20 rounded" /><span className="skel h-2.5 w-28 rounded" /></span>
        </div>
        <div className="grid gap-2 px-3 pt-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="skel h-9 rounded-[10px]" style={{ opacity: 1 - i * 0.1 }} />)}
        </div>
      </aside>
      <main className="ws-main grid min-h-[70vh] place-items-center">
        <CocoLoader />
      </main>
    </div>
  );
}
