"use client";

import { useState, useTransition } from "react";
import { drawDailySlip } from "../slipActions";
import LanternStreak from "./LanternStreak";
import type { FortuneSlipRow, SlipSeverity } from "@/lib/types";

// Severity → the chit's omen label and red seal (chop) character. Red is the
// seal ink; the caution chit also tints its rule red (attention).
const OMEN: Record<SlipSeverity, { label: string; chop: string; caution: boolean }> = {
  great: { label: "Great omen", chop: "吉", caution: false },
  good: { label: "Good omen", chop: "吉", caution: false },
  even: { label: "Steady day", chop: "平", caution: false },
  caution: { label: "Needs attention", chop: "改", caution: true },
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
          <div className="flex items-center gap-3">
            {streak >= 1 && <LanternStreak count={streak} label={`${streak}-day streak`} />}
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

  const omen = OMEN[slip.severity];

  // The paper chit — cream stock, red seal. Fixed dark text so it reads the same
  // whether it floats on the daylight page or the dark Shrine hall.
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed bg-paper p-5 shadow-sm ${
        omen.caution ? "border-red-400" : "border-red-300"
      }`}
    >
      {/* red rule across the top, like a real fortune slip */}
      <div className={`absolute inset-x-0 top-0 h-1 ${omen.caution ? "bg-red-500" : "bg-red-400"}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-red-700">
            Today&apos;s fortune — {omen.label} · {slip.fortune_word}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-800">{slip.headline}</p>
          {streak >= 2 && (
            <div className="mt-3">
              <LanternStreak count={streak} label={`${streak}-day fortune streak`} />
            </div>
          )}
        </div>

        {/* the seal / chop — solid vermilion stamp, like a real name seal */}
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 rotate-6 items-center justify-center rounded-md bg-red-600 text-lg font-bold text-white shadow-sm"
        >
          {omen.chop}
        </span>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
