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

export function addCadence(dateStr: string, cadence: ManualRecurringBill["cadence"]): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export type BillFlow = RecurringFlow & { source?: "manual"; id?: string };

// A manual bill has no transaction history to project from, so its "next
// date" is just the stored due date, rolled forward by cadence each time it
// passes. Computed on read (not persisted back) so this stays a pure
// function, same as the rest of the radar — the stored next_due_date is only
// ever the bill's original anchor.
export function manualBillToFlow(bill: ManualRecurringBill, today = new Date()): BillFlow {
  const todayStr = today.toISOString().slice(0, 10);
  let next = bill.next_due_date;
  let guard = 0;
  while (daysBetween(todayStr, next) < -5 && guard < 500) {
    next = addCadence(next, bill.cadence);
    guard += 1;
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
  today = new Date(),
): BillFlow[] {
  const manualFlows = manual.map((b) => manualBillToFlow(b, today));
  return [...detected, ...manualFlows].sort((a, b) => a.daysUntil - b.daysUntil);
}
