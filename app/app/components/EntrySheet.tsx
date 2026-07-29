"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoney } from "@/app/components/CurrencyProvider";
import { displayExpression, evaluateExpression, pushKey } from "@/lib/calc";
import Keypad from "./Keypad";
import type { Category, Transaction, TransactionType } from "@/lib/types";

/**
 * The mobile money sheet — one UI for BOTH adding and editing a transaction.
 *
 * The full TransactionForm asks for type, amount, category, date and note. That
 * is the right shape in a desktop modal and the wrong shape one-handed on a
 * phone, so on mobile both paths collapse to the same thing: read the amount,
 * tap a category, done. Editing used to drop into the boxed form with a
 * different keypad on top of it; now tapping a ledger row opens this same
 * sheet, pre-filled.
 *
 * Two inferences do the work in ADD mode, both from the user's own history:
 *  - Chip ORDER is by how often they use each category.
 *  - DIRECTION (expense vs income) is per-category, from how that category has
 *    actually been used — categories carry no type in the schema, so a keypad
 *    that always posted expenses would file "Salary" as spending. When the
 *    inference says income the sheet says so on screen; it is never silent.
 *
 * In EDIT mode the row's OWN direction, date and note are carried through
 * untouched. Re-deriving direction from the category would let re-categorising
 * an old row silently flip it from income to expense, and omitting date/note
 * from the payload would wipe them — this sheet only ever changes the two
 * things it actually shows.
 */
export default function EntrySheet({
  editing,
  categories,
  transactions,
  today,
  pending,
  deleting = false,
  onSubmit,
  onDelete,
  onClose,
  onMoreOptions,
}: {
  /** null = add a new row; a Transaction = edit that row. */
  editing: Transaction | null;
  categories: Category[];
  transactions: Transaction[];
  /** Server-computed date in the user's timezone — never a bare new Date(). */
  today: string;
  pending: boolean;
  deleting?: boolean;
  onSubmit: (formData: FormData) => void;
  onDelete?: () => void;
  onClose: () => void;
  onMoreOptions: (amount: string) => void;
}) {
  const { format } = useMoney();
  const isEdit = editing !== null;
  const [expr, setExpr] = useState(() => (editing ? String(editing.amount) : ""));

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
      return u && u.income * 2 > u.total ? "income" : "expense";
    };
    return { ordered, typeOf };
  }, [categories, transactions]);

  const [categoryId, setCategoryId] = useState(
    () => editing?.category_id ?? ordered[0]?.id ?? "",
  );

  const amount = evaluateExpression(expr);
  // Editing keeps the row's own direction; adding infers it from the category.
  const type: TransactionType = isEdit ? editing.type : categoryId ? typeOf(categoryId) : "expense";
  const canSubmit = amount > 0 && !!categoryId && !pending && !deleting;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (!canSubmit) return;
    const fd = new FormData();
    fd.set("type", type);
    fd.set("amount", String(amount));
    fd.set("category_id", categoryId);
    // Editing preserves the row's date and note — this sheet doesn't show them,
    // so it must not silently blank them either.
    fd.set("date", editing?.date ?? today);
    if (editing?.note) fd.set("note", editing.note);
    onSubmit(fd);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit transaction" : "Quick add a transaction"}
    >
      <button
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
        onClick={onClose}
        aria-label="Close"
        tabIndex={-1}
      />

      <div className="quick-sheet relative max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.6)]">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

        <div className="text-center">
          {isEdit && (
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
              Editing · {editing.date}
            </p>
          )}
          <p
            className={`font-display text-4xl font-extrabold tabular-nums ${
              type === "income" ? "text-jade" : "text-ink"
            }`}
          >
            {type === "income" && amount > 0 ? "+" : ""}
            {format(amount)}
          </p>
          <p className="mt-1 h-4 font-mono text-[11px] text-ink-faint">{displayExpression(expr)}</p>
          {type === "income" && (
            <p className="mt-0.5 text-xs font-medium text-jade">money in</p>
          )}
        </div>

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
                    on ? "bg-gold-soft text-gold-text ring-1 ring-gold" : "bg-surface-3 text-ink-muted"
                  }`}
                >
                  {c.icon && <span aria-hidden>{c.icon} </span>}
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <Keypad
            onPush={(ch) => setExpr((p) => pushKey(p, ch))}
            onBackspace={() => setExpr((p) => p.slice(0, -1))}
            primaryLabel={pending ? "…" : isEdit ? "Save ✓" : "Add ✓"}
            onPrimary={submit}
            primaryDisabled={!canSubmit}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {isEdit && onDelete ? (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="text-[13px] font-medium text-vermilion disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => onMoreOptions(amount > 0 ? String(amount) : "")}
            className="text-[11px] font-medium text-gold-text underline underline-offset-2"
          >
            More options
          </button>
        </div>
      </div>
    </div>
  );
}
