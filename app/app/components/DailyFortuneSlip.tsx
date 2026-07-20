"use client";

import { useState, useTransition } from "react";
import { drawDailySlip } from "../slipActions";
import type { FortuneSlipRow, SlipSeverity } from "@/lib/types";

// Severity → the chit's omen label and vermilion seal (chop) character.
const OMEN: Record<SlipSeverity, { label: string; chop: string }> = {
  great: { label: "Great omen", chop: "吉" },
  good: { label: "Good omen", chop: "吉" },
  even: { label: "Steady day", chop: "平" },
  caution: { label: "Needs attention", chop: "改" },
};

export default function DailyFortuneSlip({
  todaySlip,
  slipStreak,
}: {
  todaySlip: FortuneSlipRow | null;
  slipStreak: number;
}) {
  const [slip, setSlip] = useState<FortuneSlipRow | null>(todaySlip);
  const [streak, setStreak] = useState(slipStreak);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDraw() {
    setError(null);
    startTransition(async () => {
      const result = await drawDailySlip();
      if (result.error || !result.data) {
        setError(result.error ?? "Could not draw your fortune — please try again.");
        return;
      }
      setStreak((prev) => (slip ? prev : prev + 1));
      setSlip(result.data);
    });
  }

  if (!slip) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Today&apos;s fortune</p>
            <p className="mt-0.5 text-sm text-ink-muted">Draw the cat&apos;s reading of your money today.</p>
          </div>
          <div className="flex items-center gap-3">
            {streak >= 1 && (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-gold-text">
                {streak}-day streak
              </span>
            )}
            <button onClick={handleDraw} disabled={pending} className="btn btn-gold px-4 py-2 text-sm">
              {pending ? "Drawing…" : "Draw today's fortune"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-vermilion">{error}</p>}
      </div>
    );
  }

  const omen = OMEN[slip.severity];

  // The paper chit — warm stock, vermilion seal. Dark ink text is fixed so it
  // reads the same whether it floats on the daylight page or the lacquer hall.
  return (
    <div className="slip p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-seal">
            Today&apos;s fortune — {omen.label} · {slip.fortune_word}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[#2a1e05]">{slip.headline}</p>
          {slip.detail && <p className="mt-1 text-sm leading-relaxed text-[#4a3a1e]">{slip.detail}</p>}
          {slip.recommendation && (
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#0e6f52]">→ {slip.recommendation}</p>
          )}
          {streak >= 2 && (
            <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#9a5a12]">
              {streak}-day fortune streak
            </p>
          )}
        </div>
        <span aria-hidden className="slip-seal seal-press text-lg">
          {omen.chop}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-vermilion">{error}</p>}
    </div>
  );
}
