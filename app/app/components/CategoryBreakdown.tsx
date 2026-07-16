"use client";

import { isCurrentMonth } from "@/lib/format";
import { useMoney } from "@/app/components/CurrencyProvider";
import type { Category, Transaction } from "@/lib/types";

export default function CategoryBreakdown({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  const { format } = useMoney();
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category_id || !isCurrentMonth(t.date)) continue;
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + t.amount);
  }

  const rows = [...totals.entries()]
    .map(([categoryId, total]) => ({
      category: categories.find((c) => c.id === categoryId),
      total,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <h2 className="text-sm font-medium text-ink-subtle">Spending by category (this month)</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-faint">No spending yet this month.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(({ category, total }) => (
            <li key={category?.id ?? "unknown"} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                <span>{category?.icon ?? "•"}</span>
                {category?.name ?? "Uncategorized"}
              </span>
              <span className="text-sm font-semibold text-ink">{format(total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
