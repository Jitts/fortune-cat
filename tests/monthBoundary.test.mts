/**
 * "This month" must not depend on which clock runs the code.
 * Run: node --import ./tests/register-alias.mjs --experimental-strip-types tests/monthBoundary.test.mts
 *
 * isCurrentMonth() and computeSafeToSpend() both used to read the runtime clock
 * (`new Date()`), so the same render answered differently on the server (UTC)
 * and in the browser (the reader's zone). At 2026-08-31T20:00Z it is still
 * August in UTC and already September in Singapore, so for those eight hours a
 * SGT reader's "spent this month" totals changed between the server HTML and
 * the client re-render — the same hydration-mismatch shape that made a bill due
 * 28 Aug display as 27 Aug (see tests/manualBills.test.mts).
 *
 * Both now take the user's calendar date as a required argument, so these
 * assertions hold in any timezone. TZ=UTC is the control; the suite's own zone
 * is the case that shipped broken.
 */
import assert from "node:assert/strict";
import { isCurrentMonth } from "@/lib/format";
import { computeSafeToSpend } from "@/lib/safeToSpend";
import type { BalanceAnchor, FortuneGoal, Transaction } from "@/lib/types";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ── isCurrentMonth ────────────────────────────────────────────────────────
assert.equal(isCurrentMonth("2026-08-01", "2026-08-13"), true);
assert.equal(isCurrentMonth("2026-08-31", "2026-08-13"), true);
assert.equal(isCurrentMonth("2026-07-31", "2026-08-13"), false);
assert.equal(isCurrentMonth("2026-09-01", "2026-08-13"), false);
// Year boundary: same month number, different year.
assert.equal(isCurrentMonth("2025-08-15", "2026-08-13"), false);
assert.equal(isCurrentMonth("2026-12-31", "2026-12-01"), true);

// ── computeSafeToSpend month bucketing ────────────────────────────────────
const tx = (date: string, type: "income" | "expense", amount: number) =>
  ({ id: date + type + amount, date, type, amount, category_id: null }) as unknown as Transaction;

const noGoals: FortuneGoal[] = [];
const noAnchor: BalanceAnchor | null = null;

// One income and one expense on the last day of August, plus one in September.
const ledger = [
  tx("2026-08-31", "income", 1000),
  tx("2026-08-31", "expense", 200),
  tx("2026-09-01", "expense", 50),
];

const onAug31 = computeSafeToSpend({
  transactions: ledger,
  goals: noGoals,
  anchor: noAnchor,
  today: "2026-08-31",
});
// August sees the August rows only: 1000 in, 200 out.
assert.equal(onAug31.safe, 800, `August bucketing wrong in ${tz}`);
assert.equal(onAug31.mode, "flow");

const onSep1 = computeSafeToSpend({
  transactions: ledger,
  goals: noGoals,
  anchor: noAnchor,
  today: "2026-09-01",
});
// September sees only the September expense — no income, so it goes negative.
assert.equal(onSep1.safe, -50, `September bucketing wrong in ${tz}`);

// The regression itself: the boundary is decided by the DATE PASSED IN, never
// by the clock. Two calls differing only in `today` must differ; two identical
// calls must match exactly, whatever time the suite runs at.
assert.notEqual(onAug31.safe, onSep1.safe);
assert.deepEqual(
  computeSafeToSpend({ transactions: ledger, goals: noGoals, anchor: noAnchor, today: "2026-08-31" }),
  onAug31,
  "same inputs produced different output — a clock leaked back in",
);

// monthProgress is the day-of-month over days-in-month, both from `today`.
assert.equal(onAug31.monthProgress, 1, "31 Aug is the whole of August");
assert.equal(Math.round(onSep1.monthProgress * 30), 1, "1 Sep is one day of thirty");

console.log(`ok — month boundaries follow the profile date, not the clock (${tz})`);
