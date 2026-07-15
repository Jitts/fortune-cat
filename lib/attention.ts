import { analyzeRecurring } from "@/lib/recurring";
import { formatCurrency } from "@/lib/format";
import type { Category, CategoryBudget, Transaction } from "@/lib/types";

/**
 * The "needs attention" fortune slip (rules, no LLM). Deterministic: the biggest
 * category over its monthly ceiling, else the most pressing recurring-radar alert
 * (spike / double charge / new biller). Null when nothing needs attention.
 */

export type AttentionSlip = { word: string; headline: string; hint: string | null };

export function computeAttention(
  transactions: Transaction[],
  categories: Category[],
  budgets: CategoryBudget[],
  today = new Date(),
): AttentionSlip | null {
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  // 1) Worst budget overflow this month.
  const spend = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category_id) continue;
    if (t.date.slice(0, 7) !== thisMonth) continue;
    spend.set(t.category_id, (spend.get(t.category_id) ?? 0) + t.amount);
  }
  let worst: { name: string; over: number } | null = null;
  for (const b of budgets) {
    const over = (spend.get(b.category_id) ?? 0) - Number(b.monthly_limit);
    if (over > 0 && (!worst || over > worst.over)) {
      const name = categories.find((c) => c.id === b.category_id)?.name ?? "A category";
      worst = { name, over };
    }
  }
  if (worst) {
    return {
      word: "凶",
      headline: `${worst.name} crossed its ceiling by ${formatCurrency(worst.over)}. The cat's ears twitch.`,
      hint: "A quiet week here mends it before month-end.",
    };
  }

  // 2) Most pressing recurring-radar alert.
  const { alerts } = analyzeRecurring(transactions, today);
  if (alerts.length > 0) {
    return { word: "凶", headline: `${alerts[0].message}.`, hint: "Worth a look before it recurs." };
  }

  return null;
}
