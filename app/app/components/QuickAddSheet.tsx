"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoney } from "@/app/components/CurrencyProvider";
import type { Category, Transaction, TransactionType } from "@/lib/types";

/**
 * Thumb-reach quick add — the mobile path for logging by hand.
 *
 * The full TransactionForm asks for type, amount, category, date, merchant and
 * note. That is the right shape on a desktop modal and the wrong shape at a
 * hawker stall with one hand on the phone. This sheet collapses the same action
 * to: type the amount, tap a category, done — everything else is inferred.
 *
 * Two inferences do that work, and both come from the user's own history rather
 * than a guess:
 *  - Chip ORDER is by how often they use each category, so the likely one is
 *    already under the thumb.
 *  - DIRECTION (expense vs income) is per-category, from how that category has
 *    actually been used. Categories carry no type in the schema, so a keypad
 *    that always posted expenses would file "Salary" as spending. When the
 *    inference says income the sheet says so on screen — it is never silent.
 *
 * Escape hatch: "More options" hands off to the full form with the amount kept.
 */

/** Left-to-right +/− chain. No precedence to worry about with only two ops. */
export function evaluateExpression(expr: string): number {
  if (!expr) return 0;
  const parts = expr.match(/[+-]?[^+-]+/g) ?? [];
  let total = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isNaN(n)) total += n;
  }
  // Round at the end: 4.20 + 4.30 must be 8.50, not 8.499999999999998.
  return Math.round(total * 100) / 100;
}

/** True when the expression is mid-entry (ends on an operator or a bare dot). */
function isIncomplete(expr: string): boolean {
  return /[+\-.]$/.test(expr);
}

export default function QuickAddSheet({
  categories,
  transactions,
  today,
  pending,
  onSubmit,
  onClose,
  onMoreOptions,
}: {
  categories: Category[];
  transactions: Transaction[];
  /** Server-computed date in the user's timezone — never a bare new Date(). */
  today: string;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  onMoreOptions: (amount: string) => void;
}) {
  const { format } = useMoney();
  const [expr, setExpr] = useState("");

  // Category order + per-category direction, both learned from real history.
  const { ordered, typeOf } = useMemo(() => {
    const uses = new Map<string, { total: number; income: number }>();
    for (const t of transactions) {
      if (!t.category_id) continue;
      const u = uses.get(t.category_id) ?? { total: 0, income: 0 };
      u.total += 1;
      if (t.type === "income") u.income += 1;
      uses.set(t.category_id, u);
    }
    const ordered = [...categories].sort((a, b) => {
      const ua = uses.get(a.id)?.total ?? 0;
      const ub = uses.get(b.id)?.total ?? 0;
      return ub - ua || a.name.localeCompare(b.name);
    });
    const typeOf = (id: string): TransactionType => {
      const u = uses.get(id);
      // Majority of that category's own rows; unused categories default to
      // expense, which is what an unseen category almost always is.
      return u && u.income * 2 > u.total ? "income" : "expense";
    };
    return { ordered, typeOf };
  }, [categories, transactions]);

  const [categoryId, setCategoryId] = useState(() => ordered[0]?.id ?? "");
  const amount = evaluateExpression(expr);
  const type = categoryId ? typeOf(categoryId) : "expense";
  const canSubmit = amount > 0 && !!categoryId && !pending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function push(ch: string) {
    setExpr((prev) => {
      if (/[0-9]/.test(ch)) return prev + ch;
      if (ch === ".") {
        const current = prev.split(/[+-]/).pop() ?? "";
        if (current.includes(".")) return prev; // one dot per operand
        return prev === "" || /[+-]$/.test(prev) ? prev + "0." : prev + ".";
      }
      // operator
      if (prev === "") return prev;
      return /[+\-.]$/.test(prev) ? prev.slice(0, -1) + ch : prev + ch;
    });
  }

  function submit() {
    if (!canSubmit) return;
    const fd = new FormData();
    fd.set("type", type);
    fd.set("amount", String(amount));
    fd.set("category_id", categoryId);
    fd.set("date", today);
    onSubmit(fd);
  }

  const key =
    "flex items-center justify-center rounded-xl py-4 text-xl font-semibold tabular-nums transition-colors active:scale-[.97]";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Quick add a transaction"
    >
      <button
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
        onClick={onClose}
        aria-label="Close quick add"
        tabIndex={-1}
      />

      <div className="quick-sheet relative max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.6)]">
        {/* grab handle */}
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

        {/* amount */}
        <div className="text-center">
          <p
            className={`font-display text-4xl font-extrabold tabular-nums ${
              type === "income" ? "text-jade" : "text-ink"
            }`}
          >
            {type === "income" && amount > 0 ? "+" : ""}
            {format(amount)}
          </p>
          <p className="mt-1 h-4 font-mono text-[11px] text-ink-faint">
            {expr && (isIncomplete(expr) || /[+-]/.test(expr)) ? expr.replace(/([+-])/g, " $1 ") : ""}
          </p>
          {type === "income" && (
            <p className="mt-0.5 text-xs font-medium text-jade">money in — {categoryName(ordered, categoryId)}</p>
          )}
        </div>

        {/* categories, most-used first */}
        <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1">
          <div className="flex w-max gap-2">
            {ordered.map((c) => {
              const on = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  aria-pressed={on}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    on
                      ? "bg-gold-soft text-gold-text ring-1 ring-gold"
                      : "bg-surface-3 text-ink-muted"
                  }`}
                >
                  {c.icon && <span aria-hidden>{c.icon} </span>}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* keypad */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {["1", "2", "3"].map((d) => (
            <button key={d} onClick={() => push(d)} className={`${key} bg-surface-3 text-ink`}>
              {d}
            </button>
          ))}
          <button
            onClick={() => push("+")}
            aria-label="Plus"
            className={`${key} bg-gold-soft text-gold-text`}
          >
            +
          </button>

          {["4", "5", "6"].map((d) => (
            <button key={d} onClick={() => push(d)} className={`${key} bg-surface-3 text-ink`}>
              {d}
            </button>
          ))}
          <button
            onClick={() => push("-")}
            aria-label="Minus"
            className={`${key} bg-gold-soft text-gold-text`}
          >
            −
          </button>

          {["7", "8", "9"].map((d) => (
            <button key={d} onClick={() => push(d)} className={`${key} bg-surface-3 text-ink`}>
              {d}
            </button>
          ))}
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`${key} row-span-2 bg-gold text-on-gold disabled:opacity-40`}
          >
            {pending ? "…" : "Add ✓"}
          </button>

          <button onClick={() => push(".")} className={`${key} bg-surface-3 text-ink`}>
            .
          </button>
          <button onClick={() => push("0")} className={`${key} bg-surface-3 text-ink`}>
            0
          </button>
          <button
            onClick={() => setExpr((p) => p.slice(0, -1))}
            aria-label="Delete last entry"
            className={`${key} bg-surface-3 text-ink-muted`}
          >
            ⌫
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-ink-faint">
          <span>calculator built in — “4.20 + 4.30” just works</span>
          <button
            onClick={() => onMoreOptions(amount > 0 ? String(amount) : "")}
            className="shrink-0 font-medium text-gold-text underline underline-offset-2"
          >
            More options
          </button>
        </div>
      </div>
    </div>
  );
}

function categoryName(categories: Category[], id: string): string {
  return categories.find((c) => c.id === id)?.name ?? "";
}
