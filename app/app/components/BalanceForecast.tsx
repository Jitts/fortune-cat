"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import { computeForecast } from "@/lib/forecast";
import { useMoney } from "@/app/components/CurrencyProvider";
import type { BalanceAnchor, ManualRecurringBill, Transaction } from "@/lib/types";
import CoinGlyph from "@/app/components/CoinGlyph";

/**
 * "The month ahead" — the forward view. Reads the same rhythms the recurring
 * radar already learned from real captures and walks them forward day by day,
 * so the leanest day is visible before it arrives rather than after.
 *
 * The hero number is deliberately the LOW point, not the end balance: month-end
 * looking healthy is no comfort if you cross zero on the 14th.
 */

// A bare YYYY-MM-DD: formatDate pins it to UTC on both ends, so the label
// cannot slide a day for readers either side of the line.
const shortDateOpts: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
};

export default function BalanceForecast({
  transactions,
  manualBills,
  anchor,
  isPro,
}: {
  transactions: Transaction[];
  manualBills: ManualRecurringBill[];
  anchor: BalanceAnchor | null;
  isPro: boolean;
}) {
  const { format, formatDate } = useMoney();

  // Per-instance gradient id. Only one forecast renders today, so a fixed id
  // would still work — but the responsive layout duplicates organs between the
  // desktop rails and the mobile folds as a matter of course, and a shared id
  // makes url(#…) resolve to whichever copy comes first in the document, even
  // a display:none one. That has already cost us the Daruma and the cat; this
  // keeps the chart from being the third.
  const fillId = `fc-forecast-fill-${useId().replace(/:/g, "")}`;

  const f = useMemo(
    () => computeForecast({ transactions, manualBills, anchor }),
    [transactions, manualBills, anchor],
  );

  if (!isPro) {
    return (
      <div className="rounded-2xl border-t-2 border-gold bg-surface p-6 shadow-sm ring-1 ring-line">
        <div className="flex items-center gap-2">
          <CoinGlyph size={17} />
          <h2 className="text-sm font-medium text-ink-subtle">The month ahead</h2>
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-gold-text">
            PRO
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          The cat reads the rhythms in your captures — rent, paydays, subscriptions — and projects
          your balance for every day ahead, so you see the leanest day before it arrives.
        </p>
        <Link
          href="/upgrade"
          className="mt-3 inline-block rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90"
        >
          Go Pro to see ahead
        </Link>
      </div>
    );
  }

  const upcoming = f.days.slice(1).flatMap((d) => d.events.map((e) => ({ ...e, on: d.date })));
  const relative = f.mode === "relative";
  const dipsBelowZero = !relative && f.lowest != null && f.lowest.balance < 0;

  // Curve geometry. Fixed viewBox + width:100% keeps the low-point marker round.
  const W = 320;
  const H = 72;
  const vals = f.days.map((d) => d.balance);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const lo = Math.min(rawMin, relative ? rawMin : 0);
  const hi = rawMax;
  const span = hi - lo || 1;
  const x = (i: number) => (i / (f.days.length - 1 || 1)) * W;
  const y = (v: number) => H - 4 - ((v - lo) / span) * (H - 12);
  const line = f.days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.balance).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const lowIdx = f.lowest ? f.days.findIndex((d) => d.date === f.lowest!.date) : -1;
  const zeroY = lo <= 0 && hi >= 0 ? y(0) : null;

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CoinGlyph size={17} />
          <h2 className="text-sm font-medium text-ink-subtle">The month ahead</h2>
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-gold-text">
            PRO
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
          next {f.horizonDays} days
        </span>
      </div>

      {f.empty ? (
        <p className="mt-3 text-sm text-ink-muted">
          Nothing to project yet — once a few paydays and bills repeat, the cat learns their rhythm
          and starts reading the days ahead. You can also add a bill by hand in Bills.
        </p>
      ) : (
        <>
          {/* The number this feature exists for. */}
          {f.lowest && (
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                {relative ? "Lowest point ahead" : "Leanest day ahead"}
              </p>
              <p
                className={`mt-1 font-display text-3xl font-extrabold tabular-nums ${
                  dipsBelowZero ? "text-vermilion" : "text-ink"
                }`}
              >
                {relative && f.lowest.balance >= 0 ? "+" : ""}
                {format(f.lowest.balance)}
              </p>
              <p className="mt-0.5 text-xs text-ink-subtle">
                on {formatDate(f.lowest.date, shortDateOpts)}
                {relative && " — change from today"}
              </p>
            </div>
          )}

          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={
            f.lowest
              ? `Projected balance over the next ${f.horizonDays} days, lowest on ${formatDate(f.lowest.date, shortDateOpts)}`
              : "Projected balance"
          }>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--gold)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {zeroY != null && (
              <line
                x1="0"
                y1={zeroY}
                x2={W}
                y2={zeroY}
                stroke="var(--vermilion)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
            )}
            <path d={area} fill={`url(#${fillId})`} />
            <path d={line} fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinejoin="round" />
            {lowIdx > 0 && f.lowest && (
              <circle
                cx={x(lowIdx)}
                cy={y(f.lowest.balance)}
                r="3.5"
                fill={dipsBelowZero ? "var(--vermilion)" : "var(--seal)"}
                stroke="var(--surface)"
                strokeWidth="1.5"
              />
            )}
          </svg>

          {dipsBelowZero && (
            <p className="mt-2 rounded-lg bg-vermilion-soft px-3 py-2 text-xs text-vermilion">
              Your projected balance crosses zero on {formatDate(f.lowest!.date, shortDateOpts)}. Moving a bill or
              holding back a purchase before then would clear it.
            </p>
          )}

          {relative && (
            <p className="mt-2 text-xs text-ink-faint">
              Showing the <b>shape</b> of the days ahead. Confirm your real balance in the pouch
              (Home → In your pouch → details) and this becomes an exact projected balance.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Coming in</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-jade">
                +{format(f.totalIn)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Going out</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                −{format(f.totalOut)}
              </p>
            </div>
          </div>

          {upcoming.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {upcoming.slice(0, 6).map((e, i) => (
                <li
                  key={`${e.name}-${e.on}-${i}`}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-16 shrink-0 font-mono text-[10px] text-ink-faint">
                      {formatDate(e.on, shortDateOpts).replace(/^\w+, /, "")}
                    </span>
                    <span className="truncate text-ink-muted">{e.name}</span>
                    {e.kind === "planned" && (
                      <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-px font-mono text-[9px] text-ink-subtle">
                        planned
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${e.type === "income" ? "text-jade" : "text-ink-subtle"}`}
                  >
                    {e.type === "income" ? "+" : "−"}
                    {format(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[11px] text-ink-faint">
            Projected from rhythms the radar learned in your captures, plus bills you added and
            anything you&apos;ve dated ahead. An estimate, not a guarantee.
          </p>
        </>
      )}
    </div>
  );
}
