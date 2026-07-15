"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { computeSafeToSpend } from "@/lib/safeToSpend";
import { formatCurrency } from "@/lib/format";
import { setBalanceAnchor } from "../balanceActions";
import type { BalanceAnchor, FortuneGoal, Transaction } from "@/lib/types";

/**
 * The Safe-to-Spend hero (Pro). Shows the honest "mine to spend" number with a
 * line-item receipt, a coverage line, and a pace bar. Free users see a teaser
 * (mirrors RecurringRadar's split). Ink for the figure, red only when negative
 * (attention) — never gold.
 */
export default function SafeToSpendCard({
  transactions,
  goals,
  anchor,
  isPro,
}: {
  transactions: Transaction[];
  goals: FortuneGoal[];
  anchor: BalanceAnchor | null;
  isPro: boolean;
}) {
  const router = useRouter();
  const [showReceipt, setShowReceipt] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sts = useMemo(
    () => computeSafeToSpend({ transactions, goals, anchor }),
    [transactions, goals, anchor],
  );

  if (!isPro) {
    return (
      <div className="rounded-2xl border-t-2 border-fortune-400 bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-500">🛟 Safe to spend</h2>
          <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
            PRO
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          See exactly what&apos;s yours to spend this month — after bills still due and what
          you&apos;re setting aside for goals.
        </p>
        <Link
          href="/upgrade"
          className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Go Pro to see your safe number
        </Link>
      </div>
    );
  }

  const negative = sts.safe < 0;
  const overPace = sts.spentProgress > sts.monthProgress;

  function handleSave() {
    const amount = Number(value);
    setError(null);
    if (!value || Number.isNaN(amount) || amount < 0) {
      setError("Enter your current balance.");
      return;
    }
    startTransition(async () => {
      const result = await setBalanceAnchor(amount);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setValue("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-neutral-500">🛟 Safe to spend</h2>
        <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
          PRO
        </span>
      </div>

      <p
        className={`mt-1 text-4xl font-bold tracking-tight [font-variant-numeric:tabular-nums] ${
          negative ? "text-red-600" : "text-neutral-900"
        }`}
      >
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(sts.safe))}
      </p>
      <p className="mt-1 text-xs text-neutral-500">
        {sts.coverageDays != null
          ? `covers ${sts.coverageDays} day${sts.coverageDays === 1 ? "" : "s"} at your pace`
          : "rest of the month"}
        {sts.mode === "flow" && " · month-flow estimate"}
        {sts.mode === "anchor" && sts.anchorDate && ` · from your confirmed balance`}
      </p>

      {/* Pace bar: fill = pool used, tick = where the month is. */}
      <div className="mt-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full rounded-full ${overPace ? "bg-red-500" : "bg-neutral-700"}`}
            style={{ width: `${Math.min(100, Math.round(sts.spentProgress * 100))}%` }}
          />
          <div
            className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-neutral-400"
            style={{ left: `${Math.min(100, Math.round(sts.monthProgress * 100))}%` }}
            title="on-pace marker"
          />
        </div>
        <p className="mt-1 text-[11px] text-neutral-400">
          {overPace ? "Spending ahead of the month's pace" : "On or under pace for the month"}
        </p>
      </div>

      <button
        onClick={() => setShowReceipt((v) => !v)}
        className="mt-3 text-xs font-medium text-neutral-500 underline hover:text-neutral-700"
      >
        {showReceipt ? "Hide the math" : "Show the math"}
      </button>

      {showReceipt && (
        <ul className="mt-2 space-y-1 border-t border-neutral-100 pt-2 font-mono text-xs [font-variant-numeric:tabular-nums]">
          {sts.lines.map((line, i) => (
            <li
              key={i}
              className={`flex items-center justify-between ${
                line.kind === "total"
                  ? "mt-1 border-t border-neutral-100 pt-1 font-semibold text-neutral-900"
                  : "text-neutral-600"
              }`}
            >
              <span>
                {line.kind === "add" ? "+ " : line.kind === "sub" ? "− " : "= "}
                {line.label}
              </span>
              <span>{formatCurrency(line.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-neutral-100 pt-3">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Current balance"
              className="w-40 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm [font-variant-numeric:tabular-nums] focus:border-neutral-500 focus:outline-none"
            />
            <button
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Confirm"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
            {error && <p className="w-full text-xs text-red-600">{error}</p>}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            {sts.mode === "anchor"
              ? "Re-confirm your balance →"
              : "Confirm real balance for exact figure →"}
          </button>
        )}
      </div>
    </div>
  );
}
