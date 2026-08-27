"use client";

import { useState } from "react";
import { Lantern } from "@/app/app/components/LanternStreak";

/**
 * The capture streak, made tappable. Reuses the app's own `Lantern` (exported
 * from LanternStreak) rather than redrawing it, so the paper, ribs, caps and
 * the night-time glow are the same ones the dashboard rail shows.
 */

const TOTAL = 6;

export default function ShrineLanterns() {
  const [lit, setLit] = useState<number[]>([]);

  function toggle(i: number) {
    setLit((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  const n = lit.length;
  const label =
    n === 0
      ? "No days lit yet"
      : n === TOTAL
        ? "Six days lit — a full week of not thinking about money"
        : `${n} ${n === 1 ? "day" : "days"} lit`;

  return (
    <div className="text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.32em] text-gold">
        the streak
      </p>
      <h2 className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2rem,4.4vw,3.3rem)] font-extrabold leading-none tracking-tight text-ink">
        One lantern for every day you show up.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-ink-subtle">
        Tap them. Six lit is six days you didn&apos;t have to think about money.
      </p>

      {/* The gap has to clear the SCALED box, not the laid-out one: `scale`
          grows the button's painted and hit area (~67px) while its layout
          footprint stays ~28px, so a normal gap leaves adjacent hit targets
          overlapping and a tap on the seam lights the wrong day. */}
      <div className="mt-14 flex flex-wrap items-start justify-center gap-11 sm:gap-14">
        {Array.from({ length: TOTAL }).map((_, i) => {
          const on = lit.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-pressed={on}
              aria-label={`Day ${i + 1}${on ? ", lit" : ", not lit"}`}
              className={`pressable origin-bottom scale-[2.4] p-1 ${on ? "shrine-pop" : ""}`}
            >
              <Lantern lit={on} />
            </button>
          );
        })}
      </div>

      <p
        className={`mt-16 font-display text-2xl font-extrabold tracking-tight ${
          n === TOTAL ? "text-gold-text" : n === 0 ? "text-ink-faint" : "text-ink-muted"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
