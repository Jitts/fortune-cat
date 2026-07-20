"use client";

import { useMemo } from "react";

/**
 * The Shrine's night sky: a dense field of gold star-dust behind the content,
 * visible only in dark mode (midnight hall). Two layers — a dim, dense
 * background field and a brighter, glowing sparkle layer on top — read as a
 * richer night sky than a single flat dot field. Decorative and inert
 * (pointer-events-none, aria-hidden). Positions are deterministic (seeded),
 * so server and client render identically — no hydration mismatch. Twinkle
 * is disabled under prefers-reduced-motion.
 */
export default function ShrineStars() {
  const { fieldShadow, sparkleShadow } = useMemo(() => {
    // Simple seeded PRNG so both fields are stable across SSR/CSR.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // Dense, dim background dust — mostly gold, a few cream.
    const field: string[] = [];
    for (let i = 0; i < 170; i++) {
      const x = Math.round(rand() * 1600);
      const y = Math.round(rand() * 1400);
      const gold = rand() > 0.2;
      const color = gold ? "rgba(237,195,91,0.62)" : "rgba(246,236,211,0.45)";
      field.push(`${x}px ${y}px 0 0 ${color}`);
    }

    // Sparse, bright glowing sparkles — gold only, soft blur for a real twinkle.
    const sparkle: string[] = [];
    for (let i = 0; i < 34; i++) {
      const x = Math.round(rand() * 1600);
      const y = Math.round(rand() * 1400);
      sparkle.push(`${x}px ${y}px 3px 0.5px rgba(255,215,120,0.9)`);
    }

    return { fieldShadow: field.join(", "), sparkleShadow: sparkle.join(", ") };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden dark:block"
    >
      <div className="gold-dust absolute left-0 top-0 h-px w-px rounded-full" style={{ boxShadow: fieldShadow }} />
      <div
        className="gold-dust absolute left-0 top-0 h-px w-px rounded-full"
        style={{ boxShadow: fieldShadow, transform: "translate(800px, 700px)", animationDelay: "2.2s" }}
      />
      <div
        className="gold-sparkle absolute left-0 top-0 h-px w-px rounded-full"
        style={{ boxShadow: sparkleShadow }}
      />
      <div
        className="gold-sparkle absolute left-0 top-0 h-px w-px rounded-full"
        style={{ boxShadow: sparkleShadow, transform: "translate(800px, 700px)", animationDelay: "1.4s" }}
      />
    </div>
  );
}
