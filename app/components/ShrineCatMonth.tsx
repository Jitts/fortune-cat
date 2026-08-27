"use client";

import { useState } from "react";
import LuckRing from "@/app/app/components/LuckRing";
import { catState } from "@/lib/catState";

/**
 * "Set the month, watch her face." The point of this section is that the cat is
 * not a mood generator — she is `lib/catState` drawn. So this component calls
 * the real `catState()` and renders the real `LuckRing`, and the caption uses
 * the same three strings the signed-in CatRail uses. If the app's rule ever
 * changes, the landing page changes with it and the two cannot drift apart.
 *
 * Figures are illustrative (same convention as LandingDemo) — a visitor's own
 * numbers come from their ledger, not from here.
 */

type Month = { key: string; label: string; detail: string; income: number; spent: number };

const MONTHS: Month[] = [
  { key: "good", label: "A good month", detail: "Earned 4,200 · spent 1,386", income: 4200, spent: 1386 },
  { key: "even", label: "Break-even", detail: "Earned 4,200 · spent 4,200", income: 4200, spent: 4200 },
  { key: "tight", label: "A tight month", detail: "Earned 4,200 · spent 4,890", income: 4200, spent: 4890 },
];

export default function ShrineCatMonth() {
  const [picked, setPicked] = useState(MONTHS[0]);

  const net = picked.income - picked.spent;
  const savingsRate = picked.income > 0 ? Math.round((net / picked.income) * 100) : 0;
  const state = catState(net, null);

  // Verbatim from CatRail — the headline states the number the ring is drawing,
  // so the caption and the ring can never be read as disagreeing.
  const headline =
    state === "saving"
      ? `Well fed · saving ${savingsRate}%`
      : state === "even"
        ? "Watchful · breaking even"
        : "Ears back · in the red this month";

  const reading =
    state === "saving"
      ? "Money in outpaces money out — the pouch grows."
      : state === "even"
        ? "Level month — nothing gained, nothing lost."
        : "Spending has run ahead of what came in.";

  return (
    <div className="grid items-center gap-16 md:grid-cols-2 lg:gap-20">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.32em] text-gold">
          the cat is the arithmetic
        </p>
        <h2 className="mt-5 font-display text-[clamp(2.2rem,5vw,3.9rem)] font-extrabold leading-[0.96] tracking-tight text-ink">
          Set the month.
          <br />
          Watch her face.
        </h2>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-muted">
          There is no model and no mood generator. Net positive, the ears go up. Net negative, they
          go back. This is the exact rule the app runs — a mascot that disagreed with the numbers
          beside it wouldn&apos;t be charm, it would be misinformation.
        </p>

        <div
          className="mt-8 flex flex-col gap-3"
          role="radiogroup"
          aria-label="Pick a month to see how the cat responds"
        >
          {MONTHS.map((m) => {
            const on = m.key === picked.key;
            const mNet = m.income - m.spent;
            return (
              <button
                key={m.key}
                onClick={() => setPicked(m)}
                role="radio"
                aria-checked={on}
                className={`pressable flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
                  on ? "border-gold bg-surface-3" : "border-line bg-surface-2 hover:border-ink-faint"
                }`}
              >
                <span
                  className={`w-24 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] ${
                    on ? "text-gold-text" : "text-ink-subtle"
                  }`}
                >
                  {m.label}
                </span>
                <span className="min-w-0 flex-1 text-[15px] text-ink-muted">{m.detail}</span>
                <span
                  className={`shrink-0 font-display text-xl font-extrabold tracking-tight [font-variant-numeric:tabular-nums] ${
                    mNet < 0 ? "text-vermilion" : mNet > 0 ? "text-jade" : "text-ink-subtle"
                  }`}
                >
                  {mNet < 0 ? "−" : "+"}
                  {Math.abs(mNet).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <LuckRing savingsRate={savingsRate} state={state} size={300} />
        <p
          className={`mt-7 font-display text-3xl font-extrabold tracking-tight ${
            state === "saving" ? "text-jade" : state === "burning" ? "text-vermilion" : "text-ink-muted"
          }`}
        >
          {headline}
        </p>
        <p className="mt-2.5 max-w-xs text-center text-[15px] leading-relaxed text-ink-subtle">
          {reading}
        </p>
      </div>
    </div>
  );
}
