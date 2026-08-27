"use client";

import { useState } from "react";
import Daruma from "@/app/app/components/Daruma";

/**
 * "Make a wish. Paint it true." Set money aside and the daruma's second eye
 * grows in, exactly as it does on a real Fortune Goal — the same `Daruma`
 * component the app renders, driven by the same 0–1 progress it takes there.
 *
 * Figures are illustrative; a visitor's own goal is sized from their ledger.
 */

const TARGET = 10_000;
const STEP = 1_500;

export default function ShrineDaruma() {
  const [saved, setSaved] = useState(0);
  const progress = saved / TARGET;
  const done = progress >= 1;

  return (
    <div className="grid items-center gap-16 md:grid-cols-[0.9fr_1.1fr] lg:gap-20">
      <div className="flex flex-col items-center">
        <Daruma progress={progress} size={230} />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
          {done ? "both eyes painted — wish fulfilled" : "one eye painted — the wish is set"}
        </p>
      </div>

      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.32em] text-gold">
          fortune goals
        </p>
        <h2 className="mt-5 font-display text-[clamp(2.1rem,4.6vw,3.6rem)] font-extrabold leading-[0.96] tracking-tight text-ink">
          Make a wish.
          <br />
          Paint it true.
        </h2>
        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-muted">
          The tradition: paint one eye when you set the wish, the other when it comes true. Here the
          second eye grows with the goal. Put money in and watch it fill.
        </p>

        <div className="mt-8 rounded-3xl border border-line bg-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-ink">Emergency fund</p>
              <p className="mt-1 font-mono text-xs text-ink-subtle [font-variant-numeric:tabular-nums]">
                {saved.toLocaleString()} of {TARGET.toLocaleString()}
              </p>
            </div>
            <span className="font-display text-3xl font-extrabold tracking-tight text-gold-text [font-variant-numeric:tabular-nums]">
              {Math.round(progress * 100)}%
            </span>
          </div>

          <div
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Emergency fund progress"
          >
            <div
              className="h-full rounded-full transition-[width] duration-[620ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                width: `${Math.max(2, progress * 100)}%`,
                background: "linear-gradient(90deg, var(--leaf-hi), var(--gold) 60%, var(--seal))",
              }}
            />
          </div>

          <div className="mt-5 flex gap-2.5">
            <button
              onClick={() => setSaved((s) => Math.min(TARGET, s + STEP))}
              disabled={done}
              className="btn btn-gold flex-1 px-4 py-3 text-sm"
            >
              {done ? "Wish fulfilled" : `Set aside ${STEP.toLocaleString()}`}
            </button>
            <button
              onClick={() => setSaved(0)}
              className="btn btn-ghost px-5 py-3 text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
