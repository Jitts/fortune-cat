"use client";

import { useState, useTransition } from "react";
import { drawDailySlip } from "../slipActions";
import type { FortuneSlipRow, SlipSeverity } from "@/lib/types";

// Severity → tone. Per DESIGN: red is reserved for real attention (caution),
// emerald for a good-money reading, gold for the fortune organ itself, neutral
// for even. Never gold-for-alarm.
const TONE: Record<SlipSeverity, { ring: string; word: string; badge: string; label: string }> = {
  great: {
    ring: "ring-fortune-400",
    word: "text-fortune-700",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Great fortune",
  },
  good: {
    ring: "ring-emerald-200",
    word: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
    label: "Good fortune",
  },
  even: {
    ring: "ring-line",
    word: "text-ink-muted",
    badge: "bg-surface-3 text-ink-muted",
    label: "Steady",
  },
  caution: {
    ring: "ring-red-200",
    word: "text-red-600",
    badge: "bg-red-50 text-red-600",
    label: "Caution",
  },
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
      // Drawing today extends the streak by one only if today wasn't already drawn.
      setStreak((prev) => (slip ? prev : prev + 1));
      setSlip(result.data);
    });
  }

  const streakChip = streak >= 2 && (
    <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
      🎴 {streak}-day fortune streak
    </span>
  );

  if (!slip) {
    return (
      <div className="rounded-2xl border-t-2 border-fortune-400 bg-surface p-5 shadow-sm ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-subtle">Today&apos;s fortune</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Draw the cat&apos;s reading of your money today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {streakChip}
            <button
              onClick={handleDraw}
              disabled={pending}
              className="rounded-lg bg-fortune-400 px-4 py-2 text-sm font-semibold text-fortune-700 shadow-sm transition hover:bg-fortune-400/90 disabled:opacity-60"
            >
              {pending ? "Drawing…" : "Draw today's fortune 🎴"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const tone = TONE[slip.severity];

  return (
    <div className={`rounded-2xl bg-surface p-5 shadow-sm ring-1 ${tone.ring}`}>
      <div className="flex items-start gap-4">
        <div
          className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-fortune-50 ring-1 ring-fortune-400 ${tone.word}`}
          aria-hidden
        >
          <span className="text-2xl font-bold leading-none">{slip.fortune_word}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${tone.badge}`}>
              {tone.label}
            </span>
            {streakChip}
          </div>
          <p className="mt-1.5 text-sm font-medium text-ink">{slip.headline}</p>
        </div>
      </div>
    </div>
  );
}
