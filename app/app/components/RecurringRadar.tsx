"use client";

import { useMemo } from "react";
import Link from "next/link";
import { analyzeRecurring } from "@/lib/recurring";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";

function dueLabel(daysUntil: number, nextDate: string): string {
  const date = new Date(`${nextDate}T00:00:00`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
  if (daysUntil < 0) return `${date} · overdue`;
  if (daysUntil === 0) return `${date} · today`;
  if (daysUntil === 1) return `${date} · tomorrow`;
  return `${date} · in ${daysUntil} days`;
}

/**
 * The forward-looking card: recurring flows due in the next two weeks and
 * anything that deserves attention (double charges, spikes, new billers).
 * Pro feature — free users see a teaser of what the radar already found.
 */
export default function RecurringRadar({
  transactions,
  isPro,
}: {
  transactions: Transaction[];
  isPro: boolean;
}) {
  const { upcoming, alerts } = useMemo(() => analyzeRecurring(transactions), [transactions]);

  if (upcoming.length === 0 && alerts.length === 0) return null;

  if (!isPro) {
    return (
      <div className="rounded-2xl border-t-2 border-fortune-400 bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-500">🔭 Recurring radar</h2>
          <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
            PRO
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          The radar has learned your rhythms:{" "}
          <b>
            {upcoming.length} flow{upcoming.length === 1 ? "" : "s"} due in the next 14 days
          </b>
          {alerts.length > 0 && (
            <>
              {" "}
              and <b className="text-red-600">{alerts.length} thing{alerts.length === 1 ? "" : "s"} to check</b>
            </>
          )}
          .
        </p>
        <Link
          href="/upgrade"
          className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Go Pro to see what&apos;s coming
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-neutral-500">🔭 Coming up · next 14 days</h2>
        <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
          PRO
        </span>
      </div>

      {upcoming.length > 0 ? (
        <ul className="mt-3 divide-y divide-neutral-100">
          {upcoming.map((f) => (
            <li key={f.key} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{f.name}</p>
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500">
                  <span>{dueLabel(f.daysUntil, f.nextDate)}</span>
                  <span className="rounded-full bg-neutral-100 px-1.5 py-px font-mono text-[10px] text-neutral-500">
                    {f.cadence}
                  </span>
                  {f.biller && (
                    <span className="rounded-full bg-neutral-100 px-1.5 py-px font-mono text-[10px] text-neutral-500">
                      ↻ biller
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                  f.type === "income" ? "text-emerald-700" : "text-neutral-900"
                }`}
              >
                {f.type === "income" ? "+" : "−"}~{formatCurrency(f.expectedAmount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">Nothing due in the next two weeks.</p>
      )}

      {alerts.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-600">
            Needs attention
          </p>
          <ul className="mt-1 space-y-1.5">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span className={a.kind === "new_biller" ? "text-amber-700" : "text-red-600"}>
                  {a.kind === "new_biller" ? "◍ " : "! "}
                  {a.message}
                </span>
                <span className="shrink-0 font-semibold text-neutral-900 [font-variant-numeric:tabular-nums]">
                  −{formatCurrency(a.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] text-neutral-400">
        Learned from your captured history — rules only, nothing leaves your ledger.
      </p>
    </div>
  );
}
