"use client";

import { useMemo } from "react";
import { computeAttention } from "@/lib/attention";
import { useMoney } from "@/app/components/CurrencyProvider";
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
  const { currency, locale } = useMoney();
  const attention = useMemo(
    () => computeAttention(transactions, categories, budgets, currency, locale),
    [transactions, categories, budgets, currency, locale],
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
        <div className="slip p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-seal">
                Needs attention · {attention.word}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#2a1e05]">
                {attention.headline}
              </p>
              {attention.hint && (
                <p className="mt-2 text-xs font-medium text-[#0e6f52]">→ {attention.hint}</p>
              )}
            </div>
            <span aria-hidden className="slip-seal text-lg">
              改
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
