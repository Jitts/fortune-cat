"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppChrome from "@/app/components/AppChrome";
import { formatCurrency } from "@/lib/format";
import { analyzePeriod, periodRange, type Delta, type PeriodPreset } from "@/lib/analytics";
import type { Category, Transaction } from "@/lib/types";

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "12m", label: "12 months" },
  { key: "all", label: "All time" },
];

function DeltaTag({ delta, invertGood }: { delta: Delta; invertGood?: boolean }) {
  if (!delta || delta.direction === "flat") {
    return <span className="text-[11px] text-neutral-400">— vs last period</span>;
  }
  // For expenses, "up" is bad; for savings rate, "up" is good.
  const good = invertGood ? delta.direction === "down" : delta.direction === "up";
  return (
    <span className={`text-[11px] font-medium ${good ? "text-emerald-700" : "text-red-600"}`}>
      {delta.direction === "up" ? "▲" : "▼"} {delta.value.toFixed(1)}
      {invertGood ? "%" : " pts"} vs last period
    </span>
  );
}

/** Two-series monthly bars: income (jade) vs expense (ink). */
function MonthlyChart({ monthly }: { monthly: { month: string; income: number; expense: number }[] }) {
  const max = Math.max(1, ...monthly.map((m) => Math.max(m.income, m.expense)));
  const label = (key: string) =>
    new Date(`${key}-01T00:00:00`).toLocaleDateString("en-SG", { month: "short" });
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-neutral-700" /> Out
        </span>
      </div>
      <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ minHeight: 128 }}>
        {monthly.map((m) => (
          <div key={m.month} className="flex min-w-[34px] flex-1 flex-col items-center gap-1">
            <div className="flex h-28 w-full items-end justify-center gap-1">
              <div
                className="w-1/2 max-w-[14px] rounded-t bg-emerald-600"
                style={{ height: `${(m.income / max) * 100}%` }}
                title={`${label(m.month)} · in ${formatCurrency(m.income)}`}
              />
              <div
                className="w-1/2 max-w-[14px] rounded-t bg-neutral-700"
                style={{ height: `${(m.expense / max) * 100}%` }}
                title={`${label(m.month)} · out ${formatCurrency(m.expense)}`}
              />
            </div>
            <span className="font-mono text-[10px] text-neutral-400">{label(m.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked magnitude bars — spending by category, single ink hue. */
function CategoryBars({
  categories,
}: {
  categories: { name: string; icon: string | null; total: number; pct: number }[];
}) {
  const shown = categories.slice(0, 6);
  const rest = categories.slice(6);
  const otherTotal = rest.reduce((s, c) => s + c.total, 0);
  const otherPct = rest.reduce((s, c) => s + c.pct, 0);
  const rows = [...shown];
  if (rest.length > 0) rows.push({ name: "Other", icon: "•", total: otherTotal, pct: otherPct });
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-neutral-700">
              <span>{r.icon ?? "•"}</span>
              {r.name}
            </span>
            <span className="text-neutral-500 [font-variant-numeric:tabular-nums]">
              {formatCurrency(r.total)}{" "}
              <span className="text-xs text-neutral-400">{Math.round(r.pct)}%</span>
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-neutral-700" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function InsightsShell({
  transactions,
  categories,
  isPro,
  userEmail,
  pendingReviewCount,
}: {
  transactions: Transaction[];
  categories: Category[];
  isPro: boolean;
  userEmail: string;
  pendingReviewCount: number;
}) {
  const [preset, setPreset] = useState<PeriodPreset>("3m");
  const analytics = useMemo(() => {
    const range = periodRange(preset, transactions);
    return { range, a: analyzePeriod(transactions, categories, range) };
  }, [preset, transactions, categories]);
  const { a, range } = analytics;

  if (!isPro) {
    return (
      <AppChrome userEmail={userEmail} isPro={isPro} pendingReviewCount={pendingReviewCount}>
        <div className="rounded-2xl border-t-2 border-fortune-400 bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200">
          <h1 className="text-lg font-semibold text-neutral-900">📈 Analytics</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            Deep-dive into your prosperity: savings rate and cash flow with period-over-period
            comparison, a category ranking, the months behind the trend, and the few expenses worth
            a second look. A Pro feature.
          </p>
          <Link
            href="/upgrade"
            className="mt-4 inline-block rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Go Pro to unlock Analytics
          </Link>
        </div>
      </AppChrome>
    );
  }

  return (
    <AppChrome userEmail={userEmail} isPro={isPro} pendingReviewCount={pendingReviewCount}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">📈 Analytics</h1>
          <p className="text-sm text-neutral-500">Deep dive into your prosperity and cash flow.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                preset === p.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!a.hasData ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-neutral-200">
          <p className="text-sm text-neutral-500">No transactions in {range.label.toLowerCase()} yet.</p>
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Savings rate</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900 [font-variant-numeric:tabular-nums]">
                {a.savingsRate != null ? `${Math.round(a.savingsRate * 100)}%` : "—"}
              </p>
              <DeltaTag delta={a.savingsRateDelta} />
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Net cash flow</p>
              <p
                className={`mt-1 text-2xl font-bold [font-variant-numeric:tabular-nums] ${
                  a.net >= 0 ? "text-emerald-700" : "text-neutral-900"
                }`}
              >
                {a.net >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(a.net))}
              </p>
              <p className="text-[11px] text-neutral-400 [font-variant-numeric:tabular-nums]">
                {a.avgMonthlyNet >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(a.avgMonthlyNet))}/mo average
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-neutral-200">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Total expenses</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900 [font-variant-numeric:tabular-nums]">
                {formatCurrency(a.expense)}
              </p>
              <DeltaTag delta={a.expenseDelta} invertGood />
            </div>
          </div>

          {/* Standouts */}
          {a.standouts.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
              <h2 className="text-sm font-medium text-neutral-500">What stands out</h2>
              <ul className="mt-2 space-y-1.5">
                {a.standouts.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className={s.tone === "up" ? "text-emerald-700" : s.tone === "down" ? "text-red-600" : "text-neutral-400"}>
                      {s.tone === "up" ? "▲" : s.tone === "down" ? "▼" : "•"}
                    </span>
                    {s.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Income vs expenses */}
          {a.monthly.length > 1 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
              <h2 className="mb-3 text-sm font-medium text-neutral-500">Income vs expenses</h2>
              <MonthlyChart monthly={a.monthly} />
            </div>
          )}

          {/* Category ranking */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
            <h2 className="mb-4 text-sm font-medium text-neutral-500">Spending by category</h2>
            {a.categories.length === 0 ? (
              <p className="text-sm text-neutral-400">No spending in this period.</p>
            ) : (
              <CategoryBars categories={a.categories} />
            )}
          </div>

          {/* Flagged */}
          {a.flagged.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
              <h2 className="text-sm font-medium text-neutral-500">Worth a second look</h2>
              <ul className="mt-3 divide-y divide-neutral-100">
                {a.flagged.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{f.name}</p>
                      <p className="text-xs text-neutral-500">{f.reason}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-neutral-900 [font-variant-numeric:tabular-nums]">
                      {formatCurrency(f.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-neutral-400">
                Flagged only because they&apos;re unusually large for their category — not necessarily a problem.
              </p>
            </div>
          )}
        </>
      )}
    </AppChrome>
  );
}
