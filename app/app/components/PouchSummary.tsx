"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { computeSafeToSpend } from "@/lib/safeToSpend";
import { useMoney } from "@/app/components/CurrencyProvider";
import { setBalanceAnchor } from "../balanceActions";
import type { BalanceAnchor, FortuneGoal, Transaction } from "@/lib/types";

/**
 * "In your pouch" — the mockup's pouch card. Compact by default: label, the big
 * safe-to-spend number, and the receipt breakdown lines. Same engine as before
 * (lib/safeToSpend).
 *
 * The number itself is FREE. It's derived from the user's own logged
 * transactions, and it's the one big number on Home — walling the payoff of the
 * core verb is the "nagged" failure mode PRODUCT.md's "value before the wall"
 * rejects. Pro buys the refinements: the confirmed-balance anchor (flow mode →
 * exact figure) and the pace/coverage detail. A free user's receipt is shorter
 * because Pro features feed it, which is a better upgrade pitch than a padlock.
 */
export default function PouchSummary({
  transactions,
  goals,
  anchor,
  isPro,
  timezone,
}: {
  transactions: Transaction[];
  goals: FortuneGoal[];
  anchor: BalanceAnchor | null;
  isPro: boolean;
  /** The user's IANA timezone — month-end is their calendar's, not the runtime's. */
  timezone: string;
}) {
  const { format, locale } = useMoney();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sts = useMemo(
    () => computeSafeToSpend({ transactions, goals, anchor }),
    [transactions, goals, anchor],
  );

  // The user's own calendar month, not the runtime's — near local midnight on
  // the 31st these disagree, and "till 31 Aug" would flip a month early.
  const todayLocal = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: timezone })}T00:00:00`);
  const monthEnd = new Date(todayLocal.getFullYear(), todayLocal.getMonth() + 1, 0).toLocaleDateString(
    locale,
    { day: "numeric", month: "short" },
  );

  const negative = sts.safe < 0;
  const overPace = sts.spentProgress > sts.monthProgress;
  const breakdown = sts.lines.filter((l) => l.kind !== "total");

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
      window.location.reload();
    });
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          In your pouch <span className="text-ink-faint/70">· till {monthEnd}</span>
        </p>
        {isPro && (
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[9px] font-semibold text-gold-text">
            PRO
          </span>
        )}
      </div>

      <p
        className={`mt-1 text-3xl font-bold tracking-tight [font-variant-numeric:tabular-nums] ${
          negative ? "text-vermilion" : "text-ink"
        }`}
      >
        {negative ? "−" : ""}
        {format(Math.abs(sts.safe))}
      </p>

      <dl className="mt-3 space-y-1 border-t border-line pt-3 text-xs [font-variant-numeric:tabular-nums]">
        {breakdown.map((line, i) => (
          <div key={i} className="flex items-center justify-between">
            <dt className="text-ink-muted">
              {line.kind === "sub" ? "− " : ""}
              {line.label}
            </dt>
            <dd className="text-ink">{format(line.amount)}</dd>
          </div>
        ))}
      </dl>

      {isPro ? (
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 text-xs font-medium text-ink-subtle underline hover:text-ink-muted"
        >
          {open ? "Hide details" : "Details"}
        </button>
      ) : (
        <Link
          href="/upgrade"
          className="mt-3 inline-block text-xs font-medium text-ink-subtle underline hover:text-ink-muted"
        >
          Go Pro to confirm your real balance and see your pace →
        </Link>
      )}

      {isPro && open && (
        <div className="mt-3 border-t border-line pt-3">
          {/* pace bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full ${overPace ? "bg-vermilion" : "bg-out"}`}
              style={{ width: `${Math.min(100, Math.round(sts.spentProgress * 100))}%` }}
            />
            <div
              className="absolute top-[-2px] h-[calc(100%+4px)] w-px bg-ink-faint"
              style={{ left: `${Math.min(100, Math.round(sts.monthProgress * 100))}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            {sts.coverageDays != null
              ? `covers ${sts.coverageDays} day${sts.coverageDays === 1 ? "" : "s"} at your pace`
              : "rest of the month"}
            {overPace ? " · ahead of pace" : " · on/under pace"}
          </p>

          <div className="mt-3">
            {editing ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Current balance"
                  className="w-36 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink [font-variant-numeric:tabular-nums] focus:border-ink-faint focus:outline-none"
                />
                <button
                  onClick={handleSave}
                  disabled={pending}
                  className="rounded-lg bg-action px-3 py-1.5 text-sm font-medium text-white hover:bg-action/90 disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Confirm"}
                </button>
                <button onClick={() => setEditing(false)} className="text-sm text-ink-subtle hover:text-ink">
                  Cancel
                </button>
                {error && <p className="w-full text-xs text-vermilion">{error}</p>}
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-ink-muted hover:text-ink"
              >
                {sts.mode === "anchor" ? "Re-confirm your balance →" : "Confirm real balance for exact figure →"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
