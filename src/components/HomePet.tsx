"use client";

import { useEffect, useState } from "react";
import Character from "@/components/Character";

// The pet on Home: mostly just being there; when something is waiting (today's pack), a happy wiggle now and then,
// not a non-stop loop. Tapping it still gets a reaction.
export default function HomePet({ moods, version, eager, className = "" }: { moods: Record<string, string[]>; version: string; eager: boolean; className?: string }) {
  const [wiggle, setWiggle] = useState(false);
  useEffect(() => {
    if (!eager) return;
    let off: ReturnType<typeof setTimeout>;
    const first = setTimeout(() => setWiggle(true), 1200);
    const every = setInterval(() => {
      setWiggle(true);
      off = setTimeout(() => setWiggle(false), 2300);
    }, 10500);
    const firstOff = setTimeout(() => setWiggle(false), 3500);
    return () => {
      clearTimeout(first);
      clearTimeout(firstOff);
      clearTimeout(off);
      clearInterval(every);
    };
  }, [eager]);
  return <Character moods={moods} mood={wiggle ? "happy" : "idle"} version={version} className={className} interactive />;
}
