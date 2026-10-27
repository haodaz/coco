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
// what that picture rests on, and which senses its imprints have opened.
export default function MemoryPanel({ pet, memory }: { pet: Pet; memory: Memory }) {
  const pct = memory.next ? Math.round(((memory.points - memory.floor) / (memory.next - memory.floor)) * 100) : 100;
  return (
    <section className="grid gap-6 rounded-2xl bg-white p-5 shadow-[0_6px_24px_rgba(40,50,110,.08)] sm:grid-cols-[200px_1fr]">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/likeness/${pet.id}?p=${memory.points}-${pet.likeness?.at ?? ""}`} alt="" className="aspect-[3/4] w-full rounded-xl bg-[#eef0f6] object-cover [image-rendering:pixelated]" />
      </div>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold uppercase tracking-[.14em] text-[var(--sub)]">How well I know {pet.name}</div>
        <div className="mt-1 text-[24px] font-bold leading-tight">{memory.name}</div>
        <div className="mt-1 text-[13px] text-[var(--sub)]">
          Clarity {memory.level}/{memory.maxLevel} · {memory.next ? `${memory.next - memory.points} more to sharpen` : "fully clear"}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <span><b>{memory.imprints}</b> <span className="text-[var(--sub)]">imprints</span></span>
          <span><b>{memory.kinds}</b> <span className="text-[var(--sub)]">kinds of moment</span></span>
          <span><b>{memory.days}</b> <span className="text-[var(--sub)]">days of {pet.sex === "male" ? "his" : pet.sex === "female" ? "her" : "their"} life</span></span>
          <span><b>{memory.notes}</b> <span className="text-[var(--sub)]">notes from you</span></span>
        </div>
        <div className="mt-4 text-[11.5px] font-semibold uppercase tracking-[.14em] text-[var(--sub)]">What I can talk about</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {memory.senses.map((s) => (
            <span key={s.pattern} className={`rounded-full px-2.5 py-1 text-[12px] ${s.imprints ? "bg-[#e8f1ff] font-medium text-[#1458c9]" : "bg-[#f2f3f7] text-[#a3a8b8]"}`}>
              {s.label}{s.imprints ? ` · ${s.imprints}` : ""}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
