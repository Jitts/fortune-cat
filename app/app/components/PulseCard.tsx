import Link from "next/link";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import FortuneCat, { catState } from "./FortuneCat";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The cash-flow pulse: this month's money in vs out as mirrored daily bars
 * (jade up = in, ink down = out), net for the month, burn rate vs last month,
 * and the review strip when captures are waiting. The daily-glance screen.
 */
export default function PulseCard({
  transactions,
  balance,
  pendingReviewCount,
}: {
  transactions: Transaction[];
  balance: number;
  pendingReviewCount: number;
}) {
  const pulse = useMemo(() => {
    const now = new Date();
    const thisMonth = monthKey(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = monthKey(lastMonthDate);
    const today = now.getDate();

    const days: { in: number; out: number }[] = Array.from({ length: today }, () => ({
      in: 0,
      out: 0,
    }));
    let inTotal = 0;
    let outTotal = 0;
    let lastMonthOut = 0;

    for (const t of transactions) {
      const d = new Date(`${t.date}T00:00:00`);
      const key = monthKey(d);
      if (key === thisMonth) {
        if (t.type === "income") {
          inTotal += t.amount;
        } else {
          outTotal += t.amount;
        }
        const day = d.getDate();
        if (day >= 1 && day <= today) {
          if (t.type === "income") days[day - 1].in += t.amount;
          else days[day - 1].out += t.amount;
        }
      } else if (key === lastMonth && t.type === "expense") {
        lastMonthOut += t.amount;
      }
    }

    const maxBar = Math.max(1, ...days.map((d) => Math.max(d.in, d.out)));
    const burnPerDay = today > 0 ? outTotal / today : 0;
    const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const lastBurnPerDay = lastMonthDays > 0 ? lastMonthOut / lastMonthDays : 0;
    const burnDelta =
      lastBurnPerDay > 0 ? Math.round(((burnPerDay - lastBurnPerDay) / lastBurnPerDay) * 100) : null;

    return { days, inTotal, outTotal, net: inTotal - outTotal, maxBar, burnPerDay, burnDelta };
  }, [transactions]);

  // Capture streak: consecutive days (ending today or yesterday) on which at
  // least one row entered the ledger — the habit the autopilot builds.
  const streak = useMemo(() => {
    const daysWithRows = new Set(transactions.map((t) => t.created_at.slice(0, 10)));
    const cursor = new Date();
    if (!daysWithRows.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (daysWithRows.has(isoDay(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [transactions]);

  const state = catState(pulse.net, pulse.burnDelta);
  const savingsRate = pulse.inTotal > 0 ? Math.round((pulse.net / pulse.inTotal) * 100) : null;
  const caption =
    state === "saving"
      ? `The cat is well fed${savingsRate != null && savingsRate > 0 ? ` · saving ${savingsRate}%` : ""}`
      : state === "even"
        ? "The cat is watching · breaking even"
        : "Ears back · out is beating in";

  const monthLabel = new Date().toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink-subtle">Cash flow · {monthLabel}</p>
          <p className="text-xs text-ink-faint [font-variant-numeric:tabular-nums]">
            All-time balance {formatCurrency(balance)}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-4">
          <FortuneCat state={state} />
          <div className="min-w-0">
            <p
              className={`text-3xl font-bold tracking-tight [font-variant-numeric:tabular-nums] ${
                pulse.net >= 0 ? "text-emerald-700" : "text-ink"
              }`}
            >
              {pulse.net >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(pulse.net))}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-xs text-ink-subtle [font-variant-numeric:tabular-nums]">
              <span className="text-emerald-700">▲ in {formatCurrency(pulse.inTotal)}</span>
              <span>▼ out {formatCurrency(pulse.outTotal)}</span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
              <span>{caption}</span>
              {streak >= 2 && (
                <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
                  🔥 {streak}-day capture streak
                </span>
              )}
            </p>
          </div>
        </div>

        {pulse.days.length > 1 && (
          <div className="mt-4">
            <div className="flex items-center gap-[3px]">
              {pulse.days.map((d, i) => (
                <div key={i} className="flex h-24 flex-1 flex-col items-center" title={`${i + 1} ${monthLabel}: in ${formatCurrency(d.in)} · out ${formatCurrency(d.out)}`}>
                  <div className="flex w-full max-w-[16px] flex-1 items-end justify-center">
                    <div
                      className="w-full rounded-t-sm bg-emerald-600"
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
              <span className={pulse.burnDelta <= 0 ? "text-emerald-700" : "text-ink-muted"}>
                {Math.abs(pulse.burnDelta)}% {pulse.burnDelta <= 0 ? "below" : "above"} last month’s pace
              </span>
            </>
          )}
        </p>
      </div>

      {pendingReviewCount > 0 && (
        <Link
          href="/review"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100"
        >
          <span>
            👀 {pendingReviewCount} capture{pendingReviewCount === 1 ? "" : "s"} waiting for review
          </span>
          <span className="font-mono text-xs">CLEAR THEM →</span>
        </Link>
      )}
    </div>
  );
}
