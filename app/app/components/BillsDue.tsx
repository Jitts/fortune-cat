"use client";

import { useMemo } from "react";
import { analyzeRecurring } from "@/lib/recurring";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";

/**
 * Bills due — the next recurring expenses the radar sees coming, as a compact
 * list (name · when · GIRO/card hint · ~amount). Reuses analyzeRecurring; shown
 * in the Home right rail and the Bills tab.
 */
function whenLabel(daysUntil: number, nextDate: string): string {
  if (daysUntil <= 0) return "due now";
  if (daysUntil === 1) return "tomorrow";
  return new Date(`${nextDate}T00:00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export default function BillsDue({
  transactions,
  limit = 6,
}: {
  transactions: Transaction[];
  limit?: number;
}) {
  const bills = useMemo(
    () => analyzeRecurring(transactions).upcoming.filter((f) => f.type === "expense").slice(0, limit),
    [transactions, limit],
  );

  if (bills.length === 0) return null;

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Bills due
      </p>
      <ul className="space-y-2">
        {bills.map((b) => (
          <li
            key={b.key}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
          >
            <span className="text-lg" aria-hidden>
              {b.biller ? "💡" : "🔁"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{b.name}</p>
              <p className="text-xs text-ink-subtle">
                {whenLabel(b.daysUntil, b.nextDate)} · {b.biller ? "GIRO" : (b.accountTag ?? "card")}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
              ~{formatCurrency(b.expectedAmount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
