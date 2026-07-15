import type { Transaction } from "@/lib/types";

/**
 * This-month cash-flow signals (rules) — the shared reducer behind the cat rail
 * (luck ring + caption + streak) and the ledger's cash-flow bars. Extracted from
 * PulseCard so both read the same numbers. No LLM.
 */

export type DayFlow = { in: number; out: number };

export type MonthPulse = {
  days: DayFlow[]; // day 1 … today
  inTotal: number;
  outTotal: number;
  net: number;
  maxBar: number;
  burnPerDay: number;
  burnDelta: number | null; // % vs last month's daily pace
  savingsRate: number | null; // whole-percent net/income
  streak: number; // consecutive capture days ending today/yesterday
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthPulse(transactions: Transaction[], now = new Date()): MonthPulse {
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const today = now.getDate();

  const days: DayFlow[] = Array.from({ length: today }, () => ({ in: 0, out: 0 }));
  let inTotal = 0;
  let outTotal = 0;
  let lastMonthOut = 0;

  for (const t of transactions) {
    const d = new Date(`${t.date}T00:00:00`);
    const key = monthKey(d);
    if (key === thisMonth) {
      if (t.type === "income") inTotal += t.amount;
      else outTotal += t.amount;
      const day = d.getDate();
      if (day >= 1 && day <= today) {
        if (t.type === "income") days[day - 1].in += t.amount;
        else days[day - 1].out += t.amount;
      }
    } else if (key === lastMonth && t.type === "expense") {
      lastMonthOut += t.amount;
    }
  }

  const maxBar = Math.max(1, ...days.map((d) => Math.max(d.in, d.out)));
  const burnPerDay = today > 0 ? outTotal / today : 0;
  const lastMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const lastBurnPerDay = lastMonthDays > 0 ? lastMonthOut / lastMonthDays : 0;
  const burnDelta =
    lastBurnPerDay > 0 ? Math.round(((burnPerDay - lastBurnPerDay) / lastBurnPerDay) * 100) : null;
  const net = inTotal - outTotal;
  const savingsRate = inTotal > 0 ? Math.round((net / inTotal) * 100) : null;

  // Capture streak: consecutive days (ending today or yesterday) with a row.
  const daysWithRows = new Set(transactions.map((t) => t.created_at.slice(0, 10)));
  const cursor = new Date(now);
  if (!daysWithRows.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (daysWithRows.has(isoDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { days, inTotal, outTotal, net, maxBar, burnPerDay, burnDelta, savingsRate, streak };
}
