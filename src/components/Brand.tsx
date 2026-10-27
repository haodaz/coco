"use client";

import { useId } from "react";

// The coco mark: two circles, you and your pet, overlapping; where they meet, a small heart. co + co.
// One mark everywhere: the sidebar, the sign-in page, and printed on every pack.

export function CocoMark({ className = "", mono, style }: { className?: string; mono?: string; style?: React.CSSProperties }) {
  const id = useId().replace(/:/g, ""); // each mark its own gradients, so a hidden one never breaks another
  const a = mono ?? `url(#${id}a)`;
  const b = mono ?? `url(#${id}b)`;
  return (
    <svg viewBox="0 0 48 32" className={className} style={style} aria-hidden>
      {!mono && (
        <defs>
          <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2b3a8f" />
            <stop offset="1" stopColor="#5b3fb0" />
          </linearGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8f3fb0" />
            <stop offset="1" stopColor="#c2418f" />
          </linearGradient>
        </defs>
      )}
      <circle cx="16" cy="16" r="13" fill="none" stroke={a} strokeWidth="5" />
      <circle cx="32" cy="16" r="13" fill="none" stroke={b} strokeWidth="5" />
      {/* the heart where the two meet */}
      <path d="M24 21.2c-.3 0-3.6-2.3-3.6-4.6 0-1.2.9-2.1 2-2.1.7 0 1.3.4 1.6.9.3-.5.9-.9 1.6-.9 1.1 0 2 .9 2 2.1 0 2.3-3.3 4.6-3.6 4.6z" fill={mono ?? "#c2418f"} />
    </svg>
  );
}

export function CocoLogo({ className = "", size = 24, mono, word = true }: { className?: string; size?: number; mono?: string; word?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <CocoMark mono={mono} className="shrink-0" style={{ width: size * 1.45, height: size }} />
      {word && (
        <span className="font-bold tracking-tight" style={{ fontSize: size, lineHeight: 1, color: mono, fontFamily: "Fraunces, \"Noto Serif SC\", Georgia, serif" }}>
          coco
        </span>
      )}
    </span>
  );
}
