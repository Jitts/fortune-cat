"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCurrency, isCurrentMonth } from "@/lib/format";
import type { Category, CategoryBudget, Transaction } from "@/lib/types";
import { setBudget, removeBudget } from "../budgetActions";

// Spend is "out" (ink); attention escalates ink → amber → red, keeping red for
// the genuine over-budget state per the app's colour rules.
function stateFor(pct: number) {
  if (pct >= 100) return { bar: "bg-red-600", chip: "Over", chipCls: "bg-red-50 text-red-700" };
  if (pct >= 80) return { bar: "bg-amber-500", chip: "Caution", chipCls: "bg-amber-50 text-amber-700" };
  return { bar: "bg-out", chip: null, chipCls: "" };
}

export default function FortuneBudget({
  budgets,
  categories,
  transactions,
}: {
  budgets: CategoryBudget[];
  categories: Category[];
  transactions: Transaction[];
}) {
  const [items, setItems] = useState(budgets);
  const [editId, setEditId] = useState<string | null>(null); // category_id being edited
  const [editValue, setEditValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [addCategory, setAddCategory] = useState("");
  const [addValue, setAddValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Current-month expense per category (matches CategoryBreakdown).
  const spendByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.category_id || !isCurrentMonth(t.date)) continue;
      m.set(t.category_id, (m.get(t.category_id) ?? 0) + t.amount);
    }
    return m;
  }, [transactions]);

  const rows = useMemo(
    () =>
      items
        .map((b) => ({
          budget: b,
          category: categories.find((c) => c.id === b.category_id),
          spent: spendByCategory.get(b.category_id) ?? 0,
        }))
        .sort((a, b) => b.spent / b.budget.monthly_limit - a.spent / a.budget.monthly_limit),
    [items, categories, spendByCategory],
  );

  const totalBudget = rows.reduce((s, r) => s + r.budget.monthly_limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const overallPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;

  const budgetedIds = new Set(items.map((b) => b.category_id));
  const budgetable = categories.filter((c) => c.name !== "Salary" && !budgetedIds.has(c.id));

  function saveEdit(categoryId: string) {
    const limit = Number(editValue);
    if (!Number.isFinite(limit) || limit <= 0) {
      setError("Enter a limit greater than 0.");
      return;
    }
    startTransition(async () => {
      const result = await setBudget(categoryId, limit);
      if (result.error || !result.data) {
        setError(result.error ?? "Could not save.");
        return;
      }
      const saved = result.data;
      setItems((prev) => prev.map((b) => (b.category_id === categoryId ? saved : b)));
      setEditId(null);
    });
  }

  function saveAdd() {
    const limit = Number(addValue);
    if (!addCategory) {
      setError("Choose a category.");
      return;
    }
    if (!Number.isFinite(limit) || limit <= 0) {
      setError("Enter a limit greater than 0.");
      return;
    }
    startTransition(async () => {
      const result = await setBudget(addCategory, limit);
      if (result.error || !result.data) {
        setError(result.error ?? "Could not save.");
        return;
      }
      setItems((prev) => [...prev, result.data!]);
      setAdding(false);
      setAddCategory("");
      setAddValue("");
    });
  }

  function handleRemove(categoryId: string) {
    startTransition(async () => {
      const result = await removeBudget(categoryId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((b) => b.category_id !== categoryId));
    });
  }

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-ink-subtle">📊 Fortune Budget · this month</h2>
        {budgetable.length > 0 && !adding && (
          <button
            onClick={() => {
              setError(null);
              setAdding(true);
              setAddCategory(budgetable[0].id);
            }}
            className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-white hover:bg-action/90"
          >
            + Set a budget
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {items.length > 0 && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs text-ink-subtle [font-variant-numeric:tabular-nums]">
            <span>
              {formatCurrency(totalSpent)} of {formatCurrency(totalBudget)} budgeted
            </span>
            <span className={remaining < 0 ? "font-semibold text-red-600" : "text-ink-subtle"}>
              {remaining < 0 ? `${formatCurrency(-remaining)} over` : `${formatCurrency(remaining)} left`}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full ${overallPct >= 100 ? "bg-red-600" : overallPct >= 80 ? "bg-amber-500" : "bg-out"}`}
              style={{ width: `${Math.min(100, overallPct)}%` }}
            />
          </div>
        </div>
      )}

      {adding && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-3">
          <select
            value={addCategory}
            onChange={(e) => setAddCategory(e.target.value)}
            className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-fortune-400 focus:outline-none"
          >
            {budgetable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveAdd()}
            placeholder="Monthly limit"
            className="w-32 rounded-lg border border-line px-2 py-1.5 text-sm [font-variant-numeric:tabular-nums] focus:border-fortune-400 focus:outline-none"
          />
          <button
            onClick={saveAdd}
            disabled={pending}
            className="rounded-lg bg-fortune-400 px-3 py-1.5 text-xs font-semibold text-fortune-700 hover:brightness-95 disabled:opacity-50"
          >
            Set
          </button>
          <button onClick={() => setAdding(false)} className="text-xs text-ink-faint hover:text-ink-muted">
            Cancel
          </button>
        </div>
      )}

      {items.length === 0 && !adding ? (
        <div className="mt-4 rounded-xl bg-surface-2 p-5 text-center">
          <p className="text-sm text-ink-muted">
            No budgets yet. Set a monthly limit on a category and watch the bar fill as you spend.
          </p>
          <button
            onClick={() => {
              setError(null);
              setAdding(true);
              setAddCategory(budgetable[0]?.id ?? "");
            }}
            className="mt-3 rounded-lg bg-fortune-400 px-4 py-2 text-sm font-semibold text-fortune-700 hover:brightness-95"
          >
            Set your first budget
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {rows.map(({ budget, category, spent }) => {
            const pct = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;
            const st = stateFor(pct);
            const left = budget.monthly_limit - spent;
            return (
              <li key={budget.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm text-ink">
                    <span>{category?.icon ?? "•"}</span>
                    {category?.name ?? "Category"}
                    {st.chip && (
                      <span className={`rounded-full px-1.5 py-px font-mono text-[10px] ${st.chipCls}`}>
                        {st.chip}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-ink-subtle [font-variant-numeric:tabular-nums]">
                    {formatCurrency(spent)} / {formatCurrency(budget.monthly_limit)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                  <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-ink-faint [font-variant-numeric:tabular-nums]">
                    {left >= 0 ? `${formatCurrency(left)} left` : `${formatCurrency(-left)} over`}
                  </span>
                  {editId === budget.category_id ? (
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(budget.category_id)}
                        className="w-24 rounded border border-line px-2 py-0.5 text-xs [font-variant-numeric:tabular-nums] focus:border-fortune-400 focus:outline-none"
                      />
                      <button
                        onClick={() => saveEdit(budget.category_id)}
                        disabled={pending}
                        className="text-xs font-medium text-fortune-700 hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditId(null)} className="text-xs text-ink-faint hover:text-ink-muted">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-3 text-xs">
                      <button
                        onClick={() => {
                          setError(null);
                          setEditId(budget.category_id);
                          setEditValue(String(budget.monthly_limit));
                        }}
                        className="font-medium text-ink-subtle hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(budget.category_id)}
                        disabled={pending}
                        className="font-medium text-ink-faint hover:text-red-600 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
