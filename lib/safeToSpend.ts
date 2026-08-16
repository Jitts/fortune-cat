import { analyzeRecurring } from "@/lib/recurring";
import type { BalanceAnchor, FortuneGoal, Transaction } from "@/lib/types";

/**
 * Safe-to-Spend (rules, no LLM) — the honest "what's actually mine to spend"
 * figure, on a hybrid model:
 *
 *   • flow mode (default, zero setup): thisMonthIncome − spentSoFar
 *       − billsStillDue − goalSetAsides, labelled "rest of {month}".
 *   • anchor mode (user confirmed a real balance): anchorBalance
 *       + incomeSinceAnchor − spentSinceAnchor − billsStillDue − goalSetAsides.
 *
 * Everything is shown as a line-item receipt, so the number is never a black
 * box. Bills come from the recurring radar (next-14-day horizon — the receipt
 * says so); set-asides are each goal's monthly contribution need.
 */

export type SafeMode = "flow" | "anchor";

export type ReceiptLine = {
  label: string;
  amount: number;
  kind: "add" | "sub" | "total";
};

export type SafeToSpend = {
  mode: SafeMode;
  safe: number;
  lines: ReceiptLine[];
  coverageDays: number | null; // safe ÷ this month's daily burn
  spentProgress: number; // 0..1 of the spendable pool already used
  monthProgress: number; // 0..1 of the month elapsed
  anchorDate: string | null;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/** Whole months from `today` to a target date, floored at 1 (never divide by 0). */
function monthsUntil(target: string, today: Date): number {
  const t = new Date(`${target}T00:00:00`);
  const months =
    (t.getFullYear() - today.getFullYear()) * 12 + (t.getMonth() - today.getMonth());
  return Math.max(1, months);
}

/** This month's per-goal contribution need, summed. Goals with no target date
 *  can't imply a monthly pace, so they contribute 0 (not counted as a reserve). */
export function goalSetAsides(goals: FortuneGoal[], today: Date): number {
  let total = 0;
  for (const g of goals) {
    const remaining = Number(g.target_amount) - Number(g.saved_amount);
    if (remaining <= 0 || !g.target_date) continue;
    total += remaining / monthsUntil(g.target_date, today);
  }
  return total;
}

/** Sum of recurring expense bills still due this month (radar's forward view). */
function billsStillDue(transactions: Transaction[], todayStr: string, thisMonth: string): number {
  const { upcoming } = analyzeRecurring(transactions, todayStr);
  let total = 0;
  for (const f of upcoming) {
    if (f.type !== "expense") continue;
    if (f.daysUntil < 0) continue; // overdue-but-shown flows aren't "still ahead"
    if (monthKey(new Date(`${f.nextDate}T00:00:00`)) !== thisMonth) continue;
    total += f.expectedAmount;
  }
  return total;
}

export function computeSafeToSpend({
  transactions,
  goals,
  anchor,
  today,
}: {
  transactions: Transaction[];
  goals: FortuneGoal[];
  anchor: BalanceAnchor | null;
  /**
   * The user's own calendar date (YYYY-MM-DD, from their profile timezone).
   * REQUIRED — it used to default to `new Date()`, so the month bucketing below
   * followed whichever clock happened to run it: UTC on the server, the
   * reader's zone in the browser. Near a month boundary that put income and
   * spending in different months on the two renders.
   */
  today: string;
}): SafeToSpend {
  // Local midnight of THEIR day. Parsing local and reading local getters is
  // self-consistent, and matches how each t.date is parsed below, so every
  // comparison here is calendar-to-calendar whatever zone the runtime is in.
  const day = new Date(`${today}T00:00:00`);
  const thisMonth = monthKey(day);
  const dayOfMonth = day.getDate();
  const daysInMonth = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();

  let monthIncome = 0;
  let monthSpent = 0;
  for (const t of transactions) {
    if (monthKey(new Date(`${t.date}T00:00:00`)) !== thisMonth) continue;
    if (t.type === "income") monthIncome += t.amount;
    else monthSpent += t.amount;
  }

  const bills = billsStillDue(transactions, today, thisMonth);
  const setAsides = goalSetAsides(goals, day);

  let mode: SafeMode;
  let safe: number;
  const lines: ReceiptLine[] = [];

  if (anchor) {
    mode = "anchor";
    const anchorDay = new Date(anchor.anchored_at).toISOString().slice(0, 10);
    let incomeSince = 0;
    let spentSince = 0;
    for (const t of transactions) {
      if (t.date < anchorDay) continue;
      if (t.type === "income") incomeSince += t.amount;
      else spentSince += t.amount;
    }
    safe = Number(anchor.balance) + incomeSince - spentSince - bills - setAsides;
    lines.push({ label: "Confirmed balance", amount: Number(anchor.balance), kind: "add" });
    if (incomeSince > 0) lines.push({ label: "Income since", amount: incomeSince, kind: "add" });
    if (spentSince > 0) lines.push({ label: "Spent since", amount: spentSince, kind: "sub" });
  } else {
    mode = "flow";
    safe = monthIncome - monthSpent - bills - setAsides;
    lines.push({ label: `Income this month`, amount: monthIncome, kind: "add" });
    lines.push({ label: "Spent so far", amount: monthSpent, kind: "sub" });
  }

  if (bills > 0) lines.push({ label: "Bills still due (14d)", amount: bills, kind: "sub" });
  if (setAsides > 0) lines.push({ label: "Goal set-asides", amount: setAsides, kind: "sub" });
  lines.push({ label: "Safe to spend", amount: safe, kind: "total" });

  const burnPerDay = dayOfMonth > 0 ? monthSpent / dayOfMonth : 0;
  const coverageDays = burnPerDay > 0 && safe > 0 ? Math.floor(safe / burnPerDay) : null;

  // Pace: how much of the month's spendable pool is used vs how far into the
  // month we are. spentProgress > monthProgress ⇒ spending ahead of pace.
  const spendablePool = monthSpent + Math.max(0, safe);
  const spentProgress = spendablePool > 0 ? monthSpent / spendablePool : 0;
  const monthProgress = daysInMonth > 0 ? dayOfMonth / daysInMonth : 0;

  return {
    mode,
    safe,
    lines,
    coverageDays,
    spentProgress,
    monthProgress,
    anchorDate: anchor ? new Date(anchor.anchored_at).toISOString().slice(0, 10) : null,
  };
}
