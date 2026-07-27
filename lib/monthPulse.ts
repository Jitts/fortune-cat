import type { Transaction } from "@/lib/types";

/**
 * This-month cash-flow signals (rules) — the shared reducer behind the cat rail
 * (luck ring + caption + streak) and the ledger's cash-flow bars. Extracted from
 * PulseCard so both read the same numbers. No LLM.
 *
 * Every date decision runs through the USER'S timezone. `created_at` is stored
 * as UTC, so slicing its ISO string yields a UTC day — comparing that against a
 * day derived from the local clock silently misaligns by one for anyone east of
 * UTC. That's what once made the capture streak collapse to zero the moment a
 * Singapore user (UTC+8) passed local midnight: the row-day set was UTC while
 * the cursor was local, so "today" and "yesterday" both missed. Pass `timezone`
 * (from the user's profile) and both sides speak the same calendar.
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

/** The calendar day `d` falls on, in `timezone` (falls back to the runtime's). */
function dayIn(d: Date, timezone?: string): string {
  if (timezone) return d.toLocaleDateString("en-CA", { timeZone: timezone });
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Previous calendar day of a bare YYYY-MM-DD, stepped in UTC so no DST drift. */
function prevDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function monthPulse(
  transactions: Transaction[],
  now = new Date(),
  timezone?: string,
): MonthPulse {
  const todayStr = dayIn(now, timezone);
  const [year, month, dayOfMonth] = todayStr.split("-").map(Number);
  const thisMonth = todayStr.slice(0, 7); // "2026-07"
  const lastMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
  const today = dayOfMonth;

  const days: DayFlow[] = Array.from({ length: today }, () => ({ in: 0, out: 0 }));
  let inTotal = 0;
  let outTotal = 0;
  let lastMonthOut = 0;

  for (const t of transactions) {
    // t.date is already a bare calendar date — compare as text so it's never
    // re-parsed through a timezone it didn't come from.
    const monthOf = t.date.slice(0, 7);
    if (monthOf === thisMonth) {
      if (t.type === "income") inTotal += t.amount;
      else outTotal += t.amount;
      const day = Number(t.date.slice(8, 10));
      if (day >= 1 && day <= today) {
        if (t.type === "income") days[day - 1].in += t.amount;
        else days[day - 1].out += t.amount;
      }
    } else if (monthOf === lastMonth && t.type === "expense") {
      lastMonthOut += t.amount;
    }
  }

  const maxBar = Math.max(1, ...days.map((d) => Math.max(d.in, d.out)));
  const burnPerDay = today > 0 ? outTotal / today : 0;
  const lastMonthDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const lastBurnPerDay = lastMonthDays > 0 ? lastMonthOut / lastMonthDays : 0;
  const burnDelta =
    lastBurnPerDay > 0 ? Math.round(((burnPerDay - lastBurnPerDay) / lastBurnPerDay) * 100) : null;
  const net = inTotal - outTotal;
  const savingsRate = inTotal > 0 ? Math.round((net / inTotal) * 100) : null;

  // Capture streak: consecutive days (ending today or yesterday) with a row,
  // both sides resolved in the user's own calendar.
  const daysWithRows = new Set(
    transactions.map((t) => dayIn(new Date(t.created_at), timezone)),
  );
  let cursor = todayStr;
  if (!daysWithRows.has(cursor)) cursor = prevDay(cursor);
  let streak = 0;
  while (daysWithRows.has(cursor)) {
    streak += 1;
    cursor = prevDay(cursor);
  }

  return { days, inTotal, outTotal, net, maxBar, burnPerDay, burnDelta, savingsRate, streak };
}
