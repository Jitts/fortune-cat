"use client";

import { useMemo } from "react";

/**
 * The Shrine's night sky: a faint field of gold star-dots behind the content,
 * visible only in dark mode (the lacquer hall). Decorative and inert
 * (pointer-events-none, aria-hidden). Positions are deterministic (seeded), so
 * server and client render identically — no hydration mismatch. The gentle
 * twinkle is disabled under prefers-reduced-motion.
 */
export default function ShrineStars() {
  const boxShadow = useMemo(() => {
    // Simple seeded PRNG so the field is stable across SSR/CSR.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const stars: string[] = [];
    for (let i = 0; i < 90; i++) {
      const x = Math.round(rand() * 1600);
      const y = Math.round(rand() * 1200);
      const gold = rand() > 0.5;
      const color = gold ? "rgba(255,215,0,0.55)" : "rgba(255,255,255,0.5)";
      stars.push(`${x}px ${y}px 0 0 ${color}`);
    }
    return stars.join(", ");
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden dark:block"
    >
      <div className="shrine-twinkle absolute left-0 top-0 h-px w-px rounded-full" style={{ boxShadow }} />
      <div
        className="shrine-twinkle absolute left-0 top-0 h-px w-px rounded-full"
        style={{ boxShadow, transform: "translate(800px, 600px)", animationDelay: "1.5s" }}
      />
    </div>
  );
}
