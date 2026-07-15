"use client";

import { useMemo } from "react";
import { analyzeRecurring } from "@/lib/recurring";
import { mergeBillFlows } from "@/lib/manualBills";
import { formatCurrency } from "@/lib/format";
import type { ManualRecurringBill, Transaction } from "@/lib/types";

/**
 * Bills due — the next recurring expenses the radar sees coming, merged with
 * anything the user entered manually (lib/manualBills). Shown in the Home
 * right rail and the Bills tab. When there's nothing yet, offers a way in
 * rather than just disappearing.
 */
function whenLabel(daysUntil: number, nextDate: string): string {
  if (daysUntil <= 0) return "due now";
  if (daysUntil === 1) return "tomorrow";
  return new Date(`${nextDate}T00:00:00`).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export default function BillsDue({
  transactions,
  manualBills,
  limit = 6,
  onAdd,
}: {
  transactions: Transaction[];
  manualBills: ManualRecurringBill[];
  limit?: number;
  onAdd?: () => void;
}) {
  const bills = useMemo(() => {
    const detected = analyzeRecurring(transactions).upcoming.filter((f) => f.type === "expense");
    const manual = manualBills.filter((b) => b.type === "expense");
    return mergeBillFlows(detected, manual).slice(0, limit);
  }, [transactions, manualBills, limit]);

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Bills due
      </p>

      {bills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface-2 p-4 text-center">
          <p className="text-xs text-ink-subtle">No bills tracked yet — telco, home loan, insurance…</p>
          {onAdd && (
            <button
              onClick={onAdd}
              className="mt-2 text-xs font-medium text-ink underline hover:text-ink-muted"
            >
              + Add a bill
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {bills.map((b) => (
            <li
              key={b.key}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <span className="text-lg" aria-hidden>
                {b.source === "manual" ? "📌" : b.biller ? "💡" : "🔁"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{b.name}</p>
                <p className="text-xs text-ink-subtle">
                  {whenLabel(b.daysUntil, b.nextDate)} ·{" "}
                  {b.biller ? "GIRO" : (b.accountTag ?? (b.source === "manual" ? "manual" : "card"))}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                ~{formatCurrency(b.expectedAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
