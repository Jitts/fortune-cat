import { analyzeRecurring } from "@/lib/recurring";
import { mergeBillFlows, type BillFlow } from "@/lib/manualBills";
import type { BalanceAnchor, ManualRecurringBill, Transaction } from "@/lib/types";

/**
 * Cash-flow forecast (rules, no LLM) — the forward half of the ledger. Where
 * Safe-to-Spend answers "what's mine to spend this month", this answers the
 * paycheck-to-paycheck question: "what does my balance look like on each day
 * ahead, and when is it lowest?"
 *
 * Every future event comes from something already known: recurring flows the
 * radar LEARNED from real captures (lib/recurring), bills the user entered by
 * hand, and any transaction they've already dated in the future. Nothing is
 * invented — so the curve is only as forward-looking as the rhythms actually
 * observed, which is the honest bound.
 *
 * Two deliberate choices:
 *  • Goal set-asides are NOT subtracted. This is a *cash balance* projection —
 *    money reserved for a goal hasn't left the account. Safe-to-Spend already
 *    nets them out; conflating the two would make this number mean neither.
 *  • A real balance needs a real starting point, so absolute figures require a
 *    balance anchor. Without one we still project the SHAPE (running change
 *    from today), which is enough to spot a dip — flagged as "relative" mode
 *    so the UI never implies precision it doesn't have.
 */

const DAY_MS = 86_400_000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysStr(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Same calendar day next month, clamped (31 Jan + 1mo → 28/29 Feb, not 3 Mar). */
function addMonthStr(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dayOfMonth = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() < dayOfMonth) d.setUTCDate(0);
  return iso(d);
}

function step(date: string, cadence: "weekly" | "monthly"): string {
  return cadence === "weekly" ? addDaysStr(date, 7) : addMonthStr(date);
}

export type ForecastEventKind = "recurring" | "manual" | "planned";

export type ForecastEvent = {
  date: string;
  name: string;
  amount: number; // positive magnitude; `type` carries the direction
  type: "income" | "expense";
  kind: ForecastEventKind;
};

export type ForecastDay = {
  date: string;
  events: ForecastEvent[];
  delta: number; // net change on this day (income − expense)
  balance: number; // running projection; in relative mode this is change-from-today
};

export type Forecast = {
  /** "balance" = anchored to a confirmed balance; "relative" = change from today. */
  mode: "balance" | "relative";
  horizonDays: number;
  startBalance: number | null; // today's balance (anchor mode only)
  days: ForecastDay[];
  /** The leanest day in the horizon — the number this whole feature exists for. */
  lowest: { date: string; balance: number } | null;
  endBalance: number;
  totalIn: number;
  totalOut: number;
  /** True when nothing is projected at all (no rhythms learned yet). */
  empty: boolean;
};

/**
 * Every occurrence of a flow between `from` and `to`. A flow whose projected
 * date already passed is rolled forward to its next cycle rather than dropped:
 * an overdue monthly bill is far more likely to land next cycle than never.
 */
function* occurrences(flow: BillFlow, from: string, to: string): Generator<string> {
  let d = flow.nextDate;
  let guard = 0;
  while (d < from && guard < 400) {
    d = step(d, flow.cadence);
    guard += 1;
  }
  while (d <= to && guard < 400) {
    yield d;
    d = step(d, flow.cadence);
    guard += 1;
  }
}

export function computeForecast({
  transactions,
  manualBills,
  anchor,
  today = new Date(),
  horizonDays = 30,
}: {
  transactions: Transaction[];
  manualBills: ManualRecurringBill[];
  anchor: BalanceAnchor | null;
  today?: Date;
  horizonDays?: number;
}): Forecast {
  const todayStr = iso(today);
  const endStr = addDaysStr(todayStr, horizonDays);

  // Today's balance = the confirmed anchor, moved by everything logged since.
  // Future-dated rows are excluded here so they can't be counted twice (they
  // reappear below as "planned" events on their own date).
  let startBalance: number | null = null;
  if (anchor) {
    const anchorDay = new Date(anchor.anchored_at).toISOString().slice(0, 10);
    let since = 0;
    for (const t of transactions) {
      if (t.date < anchorDay || t.date > todayStr) continue;
      since += t.type === "income" ? t.amount : -t.amount;
    }
    startBalance = Number(anchor.balance) + since;
  }

  const byDate = new Map<string, ForecastEvent[]>();
  const push = (e: ForecastEvent) => {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  };

  // Learned rhythms + hand-entered bills, expanded across the horizon.
  const { upcoming } = analyzeRecurring(transactions, today);
  for (const flow of mergeBillFlows(upcoming, manualBills, today)) {
    for (const date of occurrences(flow, todayStr, endStr)) {
      push({
        date,
        name: flow.name,
        amount: flow.expectedAmount,
        type: flow.type,
        kind: flow.source === "manual" ? "manual" : "recurring",
      });
    }
  }

  // Anything the user already dated ahead — a planned purchase, a known payday.
  for (const t of transactions) {
    if (t.date <= todayStr || t.date > endStr) continue;
    push({
      date: t.date,
      name: t.note?.trim() || (t.type === "income" ? "Income" : "Expense"),
      amount: t.amount,
      type: t.type,
      kind: "planned",
    });
  }

  const days: ForecastDay[] = [];
  let running = startBalance ?? 0;
  let totalIn = 0;
  let totalOut = 0;
  let lowest: { date: string; balance: number } | null = null;

  for (let i = 0; i <= horizonDays; i++) {
    const date = addDaysStr(todayStr, i);
    const events = (byDate.get(date) ?? []).sort((a, b) => b.amount - a.amount);
    let delta = 0;
    for (const e of events) {
      if (e.type === "income") {
        delta += e.amount;
        totalIn += e.amount;
      } else {
        delta -= e.amount;
        totalOut += e.amount;
      }
    }
    running = Math.round((running + delta) * 100) / 100;
    days.push({ date, events, delta, balance: running });
    // Today itself isn't a "day ahead" — the warning is about what's coming.
    if (i > 0 && (!lowest || running < lowest.balance)) {
      lowest = { date, balance: running };
    }
  }

  return {
    mode: anchor ? "balance" : "relative",
    horizonDays,
    startBalance,
    days,
    lowest,
    endBalance: running,
    totalIn,
    totalOut,
    empty: byDate.size === 0,
  };
}
