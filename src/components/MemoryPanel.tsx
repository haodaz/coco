import type { Pet } from "@/lib/types";

export type Memory = {
  points: number;
  level: number;
  maxLevel: number;
  floor: number;
  next: number | null;
  imprints: number;
  kinds: number;
  days: number;
  notes: number;
  name: string;
  senses: { pattern: string; label: string; imprints: number }[];
};

// How well the AI knows this pet: its own picture of the pet at the resolution it has earned,
// what that picture rests on, and which senses its Memory Prints have opened.
export default function MemoryPanel({ pet, memory }: { pet: Pet; memory: Memory }) {
  const pct = memory.next ? Math.round(((memory.points - memory.floor) / (memory.next - memory.floor)) * 100) : 100;
  return (
    <section className="ws-card grid gap-6 p-5 sm:grid-cols-[200px_1fr]">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/likeness/${pet.id}?p=${memory.points}-${pet.likeness?.at ?? ""}`} alt="" className="aspect-[3/4] w-full rounded-xl bg-[#eef0f6] object-cover [image-rendering:pixelated]" />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold uppercase tracking-[.14em] text-[var(--ink2)]">How well I know {pet.name}</div>
        <div className="mt-1 text-[24px] font-bold leading-tight">{memory.name}</div>
        <div className="mt-1 text-[13px] text-[var(--ink2)]">
          Clarity {memory.level}/{memory.maxLevel} · {memory.next ? `${memory.next - memory.points} more to sharpen` : "fully clear"}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <span><b>{memory.imprints}</b> <span className="text-[var(--ink2)]">Memory Prints</span></span>
          <span><b>{memory.kinds}</b> <span className="text-[var(--ink2)]">kinds of moment</span></span>
          <span><b>{memory.days}</b> <span className="text-[var(--ink2)]">days of {pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their"} life</span></span>
          <span><b>{memory.notes}</b> <span className="text-[var(--ink2)]">notes from you</span></span>
        </div>
        <div className="mt-4 text-[11.5px] font-semibold uppercase tracking-[.14em] text-[var(--ink2)]">What I can talk about</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {memory.senses.map((s) => (
            <span key={s.pattern} className={`rounded-full px-2.5 py-1 text-[12px] ${s.imprints ? "bg-[#efe9ff] font-medium text-[#5b3fb0]" : "bg-[#f2f3f7] text-[#a3a8b8]"}`}>
              {s.label}{s.imprints ? ` · ${s.imprints}` : ""}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
