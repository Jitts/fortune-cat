"use client";

import { useMemo } from "react";
import { computeAttention } from "@/lib/attention";
import DailyFortuneSlip from "./DailyFortuneSlip";
import type { Category, CategoryBudget, FortuneSlipRow, Transaction } from "@/lib/types";

/**
 * The Shrine's right-rail "Fortune slips": today's drawn slip chit, plus a
 * deterministic "needs attention" chit when a category is over its ceiling or
 * the radar flags something (lib/attention). Same paper-chit look.
 */
export default function SlipsPanel({
  transactions,
  categories,
  budgets,
  todaySlip,
  slipStreak,
  heading = true,
}: {
  transactions: Transaction[];
  categories: Category[];
  budgets: CategoryBudget[];
  todaySlip: FortuneSlipRow | null;
  slipStreak: number;
  heading?: boolean;
}) {
  const attention = useMemo(
    () => computeAttention(transactions, categories, budgets),
    [transactions, categories, budgets],
  );

  return (
    <div className="space-y-3">
      {heading && (
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Fortune slips
        </p>
      )}

      <DailyFortuneSlip todaySlip={todaySlip} slipStreak={slipStreak} />

      {attention && (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-red-400 bg-paper p-5 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-red-700">
                Needs attention · {attention.word}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-800">
                {attention.headline}
              </p>
              {attention.hint && (
                <p className="mt-2 text-xs font-medium text-emerald-700">→ {attention.hint}</p>
              )}
            </div>
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 rotate-[-8deg] items-center justify-center rounded-md border-2 border-red-500 bg-red-500/10 text-xl font-bold text-red-600"
            >
              改
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
