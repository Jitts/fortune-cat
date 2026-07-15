import { formatCurrency, isCurrentMonth } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

/**
 * Monthly insight card (Sprint 4). Pure rule-based aggregation over the current
 * month's transactions — top spend category, savings rate, biggest expense.
 */
export default function InsightCard({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  const monthTx = transactions.filter((t) => isCurrentMonth(t.date));
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  if (monthTx.length === 0) return null;

  // Top spend category
  const byCategory = new Map<string, number>();
  for (const t of monthTx) {
    if (t.type !== "expense" || !t.category_id) continue;
    byCategory.set(t.category_id, (byCategory.get(t.category_id) ?? 0) + t.amount);
  }
  let topCat: { name: string; icon: string | null; total: number } | null = null;
  for (const [catId, total] of byCategory) {
    if (!topCat || total > topCat.total) {
      const c = categories.find((c) => c.id === catId);
      topCat = { name: c?.name ?? "Uncategorized", icon: c?.icon ?? null, total };
    }
  }

  // Biggest single expense
  const biggest = monthTx
    .filter((t) => t.type === "expense")
    .reduce<Transaction | null>((max, t) => (!max || t.amount > max.amount ? t : max), null);

  // Savings rate
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm ring-1 ring-violet-100 dark:from-surface-2 dark:to-surface-2 dark:ring-line">
      <h2 className="text-sm font-medium text-violet-700 dark:text-violet-300">✨ This month&apos;s insights</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-ink-subtle">Top spend category</p>
          {topCat ? (
            <p className="mt-1 text-base font-semibold text-ink">
              {topCat.icon} {topCat.name}
              <span className="block text-xs font-normal text-ink-subtle">
                {formatCurrency(topCat.total)}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-base font-semibold text-ink-faint">—</p>
          )}
        </div>
        <div>
          <p className="text-xs text-ink-subtle">Savings rate</p>
          <p className="mt-1 text-base font-semibold text-ink">
            {savingsRate === null ? "—" : `${savingsRate}%`}
            <span className="block text-xs font-normal text-ink-subtle">of income kept</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-subtle">Biggest expense</p>
          {biggest ? (
            <p className="mt-1 text-base font-semibold text-ink">
              {formatCurrency(biggest.amount)}
              <span className="block truncate text-xs font-normal text-ink-subtle">
                {biggest.note || "—"}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-base font-semibold text-ink-faint">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
