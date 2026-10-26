import type { Card } from "@/lib/types";

// Card face: frame, text and stars are drawn here so they stay crisp; the model only supplies the art.
// Until art is generated, the original photo fills the art window.

const RARITY = {
  1: { label: "Common", frame: "linear-gradient(135deg,#d9dce6,#f5f6fa)" },
  2: { label: "Rare", frame: "linear-gradient(135deg,#9bc4ff,#e6f1ff 45%,#7aa7f0)" },
  3: { label: "Holo", frame: "linear-gradient(135deg,#ffd76a,#ff8fab 30%,#9be0ff 60%,#c79bff 85%,#ffd76a)" },
} as const;

export default function CardFront({ card, imageUrl, petName }: { card: Card; imageUrl: string; petName: string }) {
  const r = RARITY[card.rarity];
  return (
    <div className="h-full w-full rounded-2xl p-[6px]" style={{ background: r.frame }}>
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white">
        <div className="flex items-baseline justify-between gap-2 px-3 pt-2.5">
          <div className="truncate text-[13px] font-semibold text-[#1d2233]">{card.name}</div>
          <div className="shrink-0 text-[11px] text-[#f0a800]">{"★".repeat(card.rarity)}<span className="text-[#d6d9e3]">{"★".repeat(3 - card.rarity)}</span></div>
        </div>
        <div className="mx-3 mt-2 aspect-[4/3] overflow-hidden rounded-lg bg-[#f0f2f8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.art ?? imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="px-3 pt-2 text-[12px] italic leading-snug text-[#1d2233]">“{card.line}”</div>
        <div className="mt-auto border-t border-[#eef0f5] px-3 py-2 text-[10.5px] leading-snug text-[#7b8197]">
          <div>{card.observation}</div>
          <div className="mt-0.5 flex justify-between"><span>{petName}</span><span>{r.label} · {card.style}</span></div>
        </div>
      </div>
    </div>
  );
}
