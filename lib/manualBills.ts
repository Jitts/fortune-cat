import type { RecurringFlow } from "./recurring";
import type { ManualRecurringBill } from "./types";

/**
 * Bridges user-entered manual bills into the same shape the recurring radar
 * already produces, so BillsDue / RecurringRadar can render one merged,
 * sorted list without knowing the difference at render time. `source` +
 * `id` distinguish a manual row (editable/deletable) from a detected one.
 */

const DAY_MS = 86_400_000;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

/**
 * `anchor` advanced by `n` cadence steps, as a bare YYYY-MM-DD.
 *
 * Two rules, both learned the hard way:
 *
 *  1. A bare date is a calendar date, not an instant, so the whole roll stays in
 *     UTC. Parsing local midnight and serialising with toISOString() disagreed
 *     by the reader's offset — east of UTC, "2026-08-28" + 1 month came back
 *     2026-09-27, and it compounded to the 22nd over six rolls.
 *  2. Always measured from the ORIGINAL anchor, never from the previous result.
 *     Monthly keeps the anchor's day-of-month and clamps only into months too
 *     short to hold it, so 31 Jan -> 28 Feb -> 31 Mar. Re-clamping off each
 *     result would make the 28th stick and walk the bill backwards — the same
 *     compounding bug wearing a different hat.
 *
 * Due dates feed safe-to-spend's "bills still due", so drift moves money.
 */
function addCadenceSteps(
  anchor: string,
  cadence: ManualRecurringBill["cadence"],
  n: number,
): string {
  if (cadence === "weekly") {
    const d = new Date(`${anchor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7 * n);
    return d.toISOString().slice(0, 10);
  }
  const [y, m, day] = anchor.split("-").map(Number);
  const targetMonth = m - 1 + n; // 0-indexed from year y; Date.UTC normalises overflow
  const lastDayOfTarget = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, targetMonth, Math.min(day, lastDayOfTarget)))
    .toISOString()
    .slice(0, 10);
}

export function addCadence(dateStr: string, cadence: ManualRecurringBill["cadence"]): string {
  return addCadenceSteps(dateStr, cadence, 1);
}

export type BillFlow = RecurringFlow & { source?: "manual"; id?: string };

// A manual bill has no transaction history to project from, so its "next
// date" is just the stored due date, rolled forward by cadence each time it
// passes. Computed on read (not persisted back) so this stays a pure
// function, same as the rest of the radar — the stored next_due_date is only
// ever the bill's original anchor.
export function manualBillToFlow(bill: ManualRecurringBill, todayStr: string): BillFlow {
  const anchor = bill.next_due_date;
  let next = anchor;
  let steps = 0;
  while (daysBetween(todayStr, next) < -5 && steps < 500) {
    steps += 1;
    next = addCadenceSteps(anchor, bill.cadence, steps);
  }
  return {
    key: `manual:${bill.id}`,
    id: bill.id,
    source: "manual",
    name: bill.name,
    type: bill.type,
    cadence: bill.cadence,
    expectedAmount: bill.amount,
    lastDate: bill.next_due_date,
    nextDate: next,
    daysUntil: daysBetween(todayStr, next),
    biller: false,
    accountTag: bill.account_tag,
    occurrences: 0,
  };
}

// Manual entries show regardless of how far out they are (the user asked for
// them explicitly); detected flows keep analyzeRecurring's own 14-day window.
export function mergeBillFlows(
  detected: RecurringFlow[],
  manual: ManualRecurringBill[],
  todayStr: string,
): BillFlow[] {
  const manualFlows = manual.map((b) => manualBillToFlow(b, todayStr));
  return [...detected, ...manualFlows].sort((a, b) => a.daysUntil - b.daysUntil);
}
