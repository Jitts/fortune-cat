"use client";

import { useState } from "react";

/**
 * The hero ritual: shake the box, draw the slip. Sample copy, but the rule it
 * demonstrates is the real one — a slip is drawn once and then stays put, so a
 * visitor who taps twice gets the same reading back rather than a nicer one.
 *
 * The three slips mirror the omens the real DailyFortuneSlip draws (大吉 /
 * 小吉 / 凶); `tone` is picked by ShrineCatMonth's scenario so the slip on the
 * page can never contradict the cat above it.
 */

export type SlipTone = "good" | "even" | "tight";

const SLIPS: Record<SlipTone, { omen: string; headline: string; tip: string; safe: string }> = {
  good: {
    omen: "Today — Great omen · 大吉",
    headline: "Money in outpaces money out — the pouch grows.",
    tip: "Set aside 50 while the wind is fair.",
    safe: "486.20",
  },
  even: {
    omen: "Today — Small omen · 小吉",
    headline: "Level month — nothing gained, nothing lost.",
    tip: "Hold today under 30 and you end ahead.",
    safe: "0.00",
  },
  tight: {
    omen: "Today — Warning · 凶",
    headline: "Spending has run ahead of what came in.",
    tip: "Skip one delivery today and the week recovers.",
    safe: "−690.00",
  },
};

export default function ShrineOmikuji({ tone = "good" }: { tone?: SlipTone }) {
  const [drawn, setDrawn] = useState(false);
  const [shaking, setShaking] = useState(false);
  const slip = SLIPS[tone];

  function draw() {
    if (shaking || drawn) return;
    setShaking(true);
    window.setTimeout(() => {
      setShaking(false);
      setDrawn(true);
    }, 620);
  }

  if (!drawn) {
    return (
      <div className="flex min-h-[340px] items-center justify-center">
        <button
          onClick={draw}
          aria-label="Shake the omikuji box to draw today's fortune"
          className={`pressable w-[268px] rounded-2xl border-2 border-[#d9663f] bg-gradient-to-b from-[#c0451f] to-[#8d2616] px-8 py-11 text-center shadow-[0_34px_70px_-30px_rgba(180,50,25,0.9)] ${
            shaking ? "shrine-shake" : ""
          }`}
        >
          <svg
            width="58"
            height="58"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--leaf-hi)"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="mx-auto mb-3"
          >
            <path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
            <path d="M3 5h18v3H3z" />
            <path d="M12 8v13" />
            <path d="M9 2.5 12 5l3-2.5" />
          </svg>
          <span className="block font-display text-2xl font-extrabold tracking-tight text-paper">
            Shake the box
          </span>
          <span className="mt-2.5 block font-mono text-[10px] tracking-[0.2em] text-[#f0bcae]">
            おみくじ · OMIKUJI
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[340px] items-center justify-center">
      <div className="shrine-draw slip w-full max-w-[480px] p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-seal">
              {slip.omen}
            </p>
            <p className="mt-4 font-display text-[27px] font-bold leading-[1.22] tracking-tight text-[#2a1e05]">
              {slip.headline}
            </p>
            <p className="mt-3.5 text-[17px] font-semibold leading-relaxed text-jade">{slip.tip}</p>
            <div className="mt-5 flex items-baseline justify-between border-t border-dashed border-[#c1b193] pt-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a7757]">
                Safe to spend, till month end
              </span>
              <span className="font-display text-3xl font-extrabold tracking-tight text-[#2a1e05] [font-variant-numeric:tabular-nums]">
                {slip.safe}
              </span>
            </div>
          </div>
          <span className="slip-seal seal-press text-xl">吉</span>
        </div>
        <button
          onClick={() => setDrawn(false)}
          className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8a7757] hover:text-[#2a1e05]"
        >
          ← put it back
        </button>
      </div>
    </div>
  );
}
