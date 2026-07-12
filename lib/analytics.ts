import { resolveMerchant } from "@/lib/merchants";
import type { Category, Transaction } from "@/lib/types";

/**
 * Period analytics (rules, no LLM): a backward-looking deep dive over a selected
 * window of months. Everything here is factual observation derived from the
 * user's own transactions — headline totals with prior-period comparison, a
 * category ranking, a monthly in/out series, plain-language standouts, and the
 * few genuinely unusual expenses. No prescriptive financial advice.
 */

export type PeriodPreset = "month" | "3m" | "6m" | "12m" | "all";

export type PeriodRange = {
  preset: PeriodPreset;
  label: string;
  months: string[]; // yyyy-mm in the window
  priorMonths: string[]; // equally-long preceding window ([] when none)
};

function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

/** Build the month list for a preset relative to `today`. */
export function periodRange(
  preset: PeriodPreset,
  transactions: Transaction[],
  today = new Date(),
): PeriodRange {
  const y = today.getFullYear();
  const m = today.getMonth();

  if (preset === "all") {
    const present = [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort();
    return { preset, label: "All time", months: present, priorMonths: [] };
  }

  const count = preset === "month" ? 1 : preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) months.push(monthKey(y, m - i));
  const priorMonths: string[] = [];
  for (let i = count * 2 - 1; i >= count; i--) priorMonths.push(monthKey(y, m - i));

  const label =
    preset === "month" ? "This month" : preset === "3m" ? "Last 3 months" : preset === "6m" ? "Last 6 months" : "Last 12 months";
  return { preset, label, months, priorMonths };
}

export type CategorySlice = {
  categoryId: string | null;
  name: string;
  icon: string | null;
  total: number;
  pct: number;
};

export type MonthPoint = { month: string; income: number; expense: number };

export type Standout = { text: string; tone: "neutral" | "up" | "down" };

export type FlaggedExpense = {
  id: string;
  name: string;
  amount: number;
  date: string;
  reason: string;
};

export type Delta = { value: number; direction: "up" | "down" | "flat" } | null;

export type PeriodAnalytics = {
  hasData: boolean;
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null; // net / income
  avgMonthlyNet: number;
  monthsWithData: number;
  expenseDelta: Delta; // vs prior period, % change in spend
  savingsRateDelta: Delta; // vs prior period, in percentage points
  categories: CategorySlice[];
  monthly: MonthPoint[];
  standouts: Standout[];
  flagged: FlaggedExpense[];
};

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sumByType(transactions: Transaction[], monthSet: Set<string>) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (!monthSet.has(t.date.slice(0, 7))) continue;
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense };
}

export function analyzePeriod(
  transactions: Transaction[],
  categories: Category[],
  range: PeriodRange,
): PeriodAnalytics {
  const monthSet = new Set(range.months);
  const priorSet = new Set(range.priorMonths);
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Uncategorized";
  const catIcon = (id: string | null) => categories.find((c) => c.id === id)?.icon ?? null;

  const inPeriod = transactions.filter((t) => monthSet.has(t.date.slice(0, 7)));
  const { income, expense } = sumByType(transactions, monthSet);
  const net = income - expense;
  const savingsRate = income > 0 ? net / income : null;
  const monthsWithData = new Set(inPeriod.map((t) => t.date.slice(0, 7))).size;
  const avgMonthlyNet = range.months.length > 0 ? net / range.months.length : 0;

  // --- category ranking (expenses) ---
  const catTotals = new Map<string | null, number>();
  for (const t of inPeriod) {
    if (t.type !== "expense") continue;
    catTotals.set(t.category_id, (catTotals.get(t.category_id) ?? 0) + t.amount);
  }
  const categories_: CategorySlice[] = [...catTotals.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name: catName(categoryId),
      icon: catIcon(categoryId),
      total,
      pct: expense > 0 ? (total / expense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // --- monthly in/out series ---
  const monthly: MonthPoint[] = range.months.map((month) => {
    let mi = 0;
    let me = 0;
    for (const t of inPeriod) {
      if (t.date.slice(0, 7) !== month) continue;
      if (t.type === "income") mi += t.amount;
      else me += t.amount;
    }
    return { month, income: mi, expense: me };
  });

  // --- prior-period comparison ---
  const prior = priorSet.size > 0 ? sumByType(transactions, priorSet) : null;
  let expenseDelta: Delta = null;
  let savingsRateDelta: Delta = null;
  if (prior && prior.expense > 0) {
    const pct = ((expense - prior.expense) / prior.expense) * 100;
    expenseDelta = { value: Math.abs(pct), direction: pct > 1 ? "up" : pct < -1 ? "down" : "flat" };
  }
  if (prior && prior.income > 0 && income > 0) {
    const priorRate = (prior.income - prior.expense) / prior.income;
    const pp = (savingsRate! - priorRate) * 100;
    savingsRateDelta = { value: Math.abs(pp), direction: pp > 0.5 ? "up" : pp < -0.5 ? "down" : "flat" };
  }

  // --- standouts (factual) ---
  const standouts: Standout[] = [];
  if (categories_.length > 0) {
    const top = categories_[0];
    standouts.push({
      text: `${top.name} is your biggest category at ${Math.round(top.pct)}% of spending.`,
      tone: "neutral",
    });
  }
  if (prior) {
    // fastest-growing category vs the prior window
    const priorCat = new Map<string | null, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !priorSet.has(t.date.slice(0, 7))) continue;
      priorCat.set(t.category_id, (priorCat.get(t.category_id) ?? 0) + t.amount);
    }
    let grow: { name: string; pct: number } | null = null;
    for (const c of categories_) {
      const before = priorCat.get(c.categoryId) ?? 0;
      if (before < 50 || c.total < 50) continue; // ignore noise
      const change = ((c.total - before) / before) * 100;
      if (change > 15 && (!grow || change > grow.pct)) grow = { name: c.name, pct: change };
    }
    if (grow) {
      standouts.push({
        text: `${grow.name} is up ${Math.round(grow.pct)}% versus the previous period.`,
        tone: "up",
      });
    }
    if (savingsRateDelta && savingsRate != null) {
      standouts.push({
        text:
          savingsRateDelta.direction === "up"
            ? `You're saving ${savingsRateDelta.value.toFixed(0)} points more of your income than last period.`
            : savingsRateDelta.direction === "down"
              ? `Your savings rate slipped ${savingsRateDelta.value.toFixed(0)} points versus last period.`
              : `Your savings rate held steady versus last period.`,
        tone: savingsRateDelta.direction === "down" ? "down" : "up",
      });
    }
  }

  // --- flagged: genuinely unusual expenses (> 2.5x the category's typical) ---
  const byCat = new Map<string | null, number[]>();
  for (const t of inPeriod) {
    if (t.type !== "expense") continue;
    const arr = byCat.get(t.category_id) ?? [];
    arr.push(t.amount);
    byCat.set(t.category_id, arr);
  }
  const flagged: FlaggedExpense[] = [];
  for (const t of inPeriod) {
    if (t.type !== "expense") continue;
    const amounts = byCat.get(t.category_id) ?? [];
    if (amounts.length < 3) continue; // need a baseline
    const med = median(amounts);
    if (med > 0 && t.amount >= 50 && t.amount > med * 2.5) {
      const merchant = resolveMerchant(t.note);
      flagged.push({
        id: t.id,
        name: merchant?.name ?? t.note ?? catName(t.category_id),
        amount: t.amount,
        date: t.date,
        reason: `${(t.amount / med).toFixed(1)}× your typical ${catName(t.category_id)} spend`,
      });
    }
  }
  flagged.sort((a, b) => b.amount - a.amount);

  return {
    hasData: inPeriod.length > 0,
    income,
    expense,
    net,
    savingsRate,
    avgMonthlyNet,
    monthsWithData,
    expenseDelta,
    savingsRateDelta,
    categories: categories_,
    monthly,
    standouts,
    flagged: flagged.slice(0, 5),
  };
}
