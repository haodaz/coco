"use client";

import { useEffect, useRef, useState } from "react";
import Character, { type Mood } from "@/components/Character";

// The pet as a companion that lives on the page: it sits on whatever spot it's asked to (the composer, the side
// panel, a card you're looking at, the pack being opened) and hops there in an arc. Left alone for 20 seconds,
// it lies down and dozes; any movement or key wakes it. Spots are elements marked data-coco-spot="name";
// anything can ask it to move with spotCoco("name"), or let it go home with spotCoco(null).

export const spotCoco = (spot: string | null) => window.dispatchEvent(new CustomEvent("coco-spot", { detail: spot }));
// …and a page can set how it looks for a while (busy while a pack is painted, happy when cards turn over).
export const moodCoco = (mood: Mood | null) => window.dispatchEvent(new CustomEvent("coco-mood", { detail: mood }));

const W = 92, H = 122; // the companion's box; its feet sit on the spot's top edge
const DOZE_AFTER = 20_000;

export default function Companion({ moods, mood, version = "", home }: { moods: Record<string, string[]>; mood: Mood; version?: string; home: string }) {
  const [asked, setAsked] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hop, setHop] = useState(0); // bumps on every move, restarting the hop animation
  const [faceLeft, setFaceLeft] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lastSpot = useRef<string | null>(null);
  const [dozing, setDozing] = useState(false);

  // nobody around for a while: lie down; anything happens: wake up
  useEffect(() => {
    let t = setTimeout(() => setDozing(true), DOZE_AFTER);
    const wake = () => {
      setDozing(false);
      clearTimeout(t);
      t = setTimeout(() => setDozing(true), DOZE_AFTER);
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, []);

  const [forced, setForced] = useState<Mood | null>(null);
  useEffect(() => {
    const on = (e: Event) => setAsked((e as CustomEvent).detail ?? null);
    const onMood = (e: Event) => setForced((e as CustomEvent).detail ?? null);
    window.addEventListener("coco-spot", on);
    window.addEventListener("coco-mood", onMood);
    return () => {
      window.removeEventListener("coco-spot", on);
      window.removeEventListener("coco-mood", onMood);
    };
  }, []);

  // follow the spot every frame, so scrolling and panels opening carry the companion along
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const want = asked && document.querySelector(`[data-coco-spot="${asked}"]`) ? asked : home;
      const el = document.querySelector(`[data-coco-spot="${want}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        // on top of the spot (feet on its top edge), or beside it when the space above holds something to read
        const side = el.dataset.cocoSide; // "left" / "right": stand beside the spot instead of on it
        const offset = Number(el.dataset.cocoX ?? 0.08); // where along the top edge to sit, 0..1
        const rawX = side === "left" ? r.left - W + 14 : side === "right" ? r.right - 10 : r.left + r.width * offset - W * 0.2;
        const x = Math.round(Math.min(window.innerWidth - W - 6, Math.max(6, rawX)));
        const y = Math.round(Math.max(6, side ? r.bottom - H + 6 : r.top - H + 18));
        const p = last.current;
        if (want !== lastSpot.current) {
          if (p) setFaceLeft(x < p.x - 4);
          setHop((h) => h + 1);
          lastSpot.current = want;
        }
        if (!p || p.x !== x || p.y !== y) {
          last.current = { x, y };
          setPos({ x, y });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [asked, home]);

  if (!pos) return null;
  return (
    <div
      className="pointer-events-none fixed z-[45] transition-[left,top] duration-[650ms] ease-[cubic-bezier(.3,.7,.3,1)]"
      style={{ left: pos.x, top: pos.y, width: W, height: H }}
      aria-hidden
    >
      <div key={hop} className="companion-hop h-full w-full" style={{ transform: faceLeft ? "scaleX(-1)" : undefined }}>
        <Character moods={moods} interactive mood={dozing && moods.rest?.length ? "rest" : forced ? forced : asked?.startsWith("card-") || asked?.startsWith("cite-") ? "close" : mood} version={version} className={`h-full w-full ${dozing && moods.rest?.length ? "companion-doze" : ""}`} />
      </div>
    </div>
  );
}
