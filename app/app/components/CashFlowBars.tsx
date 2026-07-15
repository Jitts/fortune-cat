"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { monthPulse } from "@/lib/monthPulse";
import type { Transaction } from "@/lib/types";

/**
 * The month's cash-flow pulse as mirrored daily bars (jade up = in, ink down =
 * out) with the burn-rate line. Lifted out of the old hero so it can sit atop
 * the Ledger tab while the luck ring lives in the cat rail.
 */
export default function CashFlowBars({ transactions }: { transactions: Transaction[] }) {
  const pulse = useMemo(() => monthPulse(transactions), [transactions]);
  const monthLabel = new Date().toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink-subtle">Cash flow · {monthLabel}</p>
        <p className="font-mono text-xs [font-variant-numeric:tabular-nums]">
          <span className="text-emerald-700 dark:text-emerald-400">▲ {formatCurrency(pulse.inTotal)}</span>
          <span className="ml-3 text-ink-muted">▼ {formatCurrency(pulse.outTotal)}</span>
        </p>
      </div>

      {pulse.days.length > 1 && (
        <div className="mt-4">
          <div className="flex items-center gap-[3px]">
            {pulse.days.map((d, i) => (
              <div
                key={i}
                className="flex h-24 flex-1 flex-col items-center"
                title={`${i + 1} ${monthLabel}: in ${formatCurrency(d.in)} · out ${formatCurrency(d.out)}`}
              >
                <div className="flex w-full max-w-[16px] flex-1 items-end justify-center">
                  <div
                    className="w-full rounded-t-sm bg-emerald-600 dark:bg-emerald-500"
                    style={{ height: d.in > 0 ? `${Math.max(6, (d.in / pulse.maxBar) * 100)}%` : 0 }}
                  />
                </div>
                <div className="w-full border-t-2 border-line" />
                <div className="flex w-full max-w-[16px] flex-1 items-start justify-center">
                  <div
                    className="w-full rounded-b-sm bg-out"
                    style={{ height: d.out > 0 ? `${Math.max(6, (d.out / pulse.maxBar) * 100)}%` : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint">
            <span>1 {new Date().toLocaleDateString("en-SG", { month: "short" })}</span>
            <span>today</span>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-subtle [font-variant-numeric:tabular-nums]">
        Burning {formatCurrency(pulse.burnPerDay)}/day
        {pulse.burnDelta != null && (
          <>
            {" · "}
            <span className={pulse.burnDelta <= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-ink-muted"}>
              {Math.abs(pulse.burnDelta)}% {pulse.burnDelta <= 0 ? "below" : "above"} last month&apos;s pace
            </span>
          </>
        )}
      </p>
    </div>
  );
}
