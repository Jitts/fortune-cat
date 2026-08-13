/**
 * Manual bill cadence rolling.
 * Run: node --import ./tests/register-alias.mjs --experimental-strip-types tests/manualBills.test.mts
 *
 * LIVE: prod showed a manual "telco" bill due 28 Aug rendering as 27 Aug for a
 * Singapore (UTC+8) reader. addCadence parsed the date as LOCAL midnight and
 * serialised it back with toISOString() (UTC), so every roll lost the user's
 * offset. manualBillToFlow rolls in a while-loop, so the error compounded: six
 * monthly rolls of 2026-08-28 landed on 2027-02-22 instead of 2027-02-28.
 *
 * These dates are not cosmetic — they become "Bills still due (14d)", which is
 * subtracted from Safe-to-Spend.
 *
 * Run this file under at least one east-of-UTC timezone; TZ=Asia/Singapore is
 * the case that actually shipped broken.
 */
import assert from "node:assert/strict";
import { addCadence, manualBillToFlow } from "@/lib/manualBills";
import type { ManualRecurringBill } from "@/lib/types";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

// One roll keeps the day-of-month.
assert.equal(addCadence("2026-08-28", "monthly"), "2026-09-28", `monthly roll drifted in ${tz}`);
assert.equal(addCadence("2026-08-28", "weekly"), "2026-09-04", `weekly roll drifted in ${tz}`);

// The compounding case: repeated rolls must not walk the date backwards.
let d = "2026-08-28";
for (let i = 0; i < 6; i++) d = addCadence(d, "monthly");
assert.equal(d, "2027-02-28", `six monthly rolls drifted in ${tz}`);

// Year boundary, and a cadence that has to cross February.
assert.equal(addCadence("2026-12-15", "monthly"), "2027-01-15");
assert.equal(addCadence("2026-12-29", "weekly"), "2027-01-05");

// End to end through the flow builder: a bill whose stored anchor is long past
// gets rolled forward, and must still land on its original day-of-month.
const bill = {
  id: "b1",
  name: "telco",
  type: "expense",
  cadence: "monthly",
  amount: 14.5,
  next_due_date: "2026-02-28",
  account_tag: null,
} as unknown as ManualRecurringBill;

const flow = manualBillToFlow(bill, new Date("2026-08-13T08:26:00Z"));
assert.equal(flow.nextDate, "2026-08-28", `rolled anchor drifted in ${tz}`);
assert.equal(flow.daysUntil, 15);

console.log(`ok — manual bill cadence holds its day-of-month (${tz})`);
