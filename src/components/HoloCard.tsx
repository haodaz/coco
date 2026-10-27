"use client";

import { useEffect, useRef } from "react";
import type { Finish } from "@/lib/finish";

// A collectible card that reacts to the pointer: it tilts toward it, light follows it,
// and each finish lays a different texture over the art. With a foreground layer (the pet cut out by SAM),
// the pet and the background move apart for depth, and on "popout" the pet steps out of the frame.
// When nobody is touching it, the card sways a little on its own so it never looks dead.

type Props = {
  art: string;
  fg?: string | null;
  plate?: string | null; // the scene without the pet: only with it do the two layers move apart
  finish: Finish;
  name: string;
  line?: string;
  stars: 1 | 2 | 3;
  label?: string;
  idle?: boolean;
};

export default function HoloCard({ art, fg, plate, finish, name, line, stars, label, idle = true }: Props) {
  // depth "2": the pet moves over a scene that no longer has it in it. depth "1": a pet layer but no clean scene yet,
  // so the layers stay together (no ghost of the pet behind it, nothing it wears left behind)
  const depth = fg && plate ? "2" : fg ? "1" : "0";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = { x: 0.5, y: 0.5, on: 0 };
    const cur = { x: 0.5, y: 0.5, on: 0 };
    let touching = false;
    let raf = 0;
    const t0 = performance.now() + Math.random() * 4000;

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      target.y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      target.on = 1;
      touching = true;
    };
    const leave = () => {
      touching = false;
      target.on = 0;
    };
    const tick = (now: number) => {
      if (!touching) {
        if (idle) {
          const t = (now - t0) / 1000;
          target.x = 0.5 + Math.sin(t * 0.7) * 0.22;
          target.y = 0.5 + Math.sin(t * 0.45 + 1) * 0.12;
          target.on = 0.55;
        } else {
          target.x = 0.5;
          target.y = 0.5;
        }
      }
      // spring-ish easing toward the pointer so the card feels like it has weight
      const k = touching ? 0.16 : 0.06;
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      cur.on += (target.on - cur.on) * 0.08;
      const dx = cur.x - 0.5;
      const dy = cur.y - 0.5;
      const s = el.style;
      s.setProperty("--px", `${cur.x * 100}%`);
      s.setProperty("--py", `${cur.y * 100}%`);
      s.setProperty("--dx", dx.toFixed(4));
      s.setProperty("--dy", dy.toFixed(4));
      s.setProperty("--rx", `${(-dy * 22).toFixed(2)}deg`);
      s.setProperty("--ry", `${(dx * 26).toFixed(2)}deg`);
      s.setProperty("--hyp", Math.min(1, Math.hypot(dx, dy) * 2.4).toFixed(3));
      s.setProperty("--on", cur.on.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    el.style.touchAction = "pan-y"; // phones: a sideways drag turns the card, an up-down swipe still scrolls the page
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointercancel", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointercancel", leave);
    };
  }, [idle]);

  return (
    <div ref={ref} className="hc" data-finish={finish} data-depth={depth}>
      <div className="hc-card">
        <div className="hc-window">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hc-bg" src={depth === "2" ? plate! : art} alt="" draggable={false} />
          <div className="hc-texture" />
          {/* the pet sits above the texture, so foil and holo shine on the world around it */}
          {fg && finish !== "popout" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hc-fg" src={fg} alt="" draggable={false} />
          )}
        </div>
        {fg && finish === "popout" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hc-fg" src={fg} alt="" draggable={false} />
        )}
        <div className="hc-frame" />
        <div className="hc-text">
          <div className="hc-name">
            <span>{name}</span>
            <span className="hc-stars">{"★".repeat(stars)}<i>{"★".repeat(3 - stars)}</i></span>
          </div>
          {line && <div className="hc-line">“{line}”</div>}
          {label && <div className="hc-label">{label}</div>}
        </div>
        <div className="hc-glare" />
      </div>
    </div>
  );
}
