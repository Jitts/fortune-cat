import { resolveMerchant } from "@/lib/merchants";
import type { Transaction } from "@/lib/types";

/**
 * Recurring radar (rules, no LLM): learns rhythms from captured history and
 * looks forward. A flow is recurring when the same merchant/biller repeats at
 * a roughly regular weekly or monthly interval with a stable amount. From
 * that we project what's coming up, and flag what deserves attention —
 * a double charge, an amount spike, a brand-new recurring biller.
 */

export type RecurringFlow = {
  key: string;
  name: string;
  type: "expense" | "income";
  cadence: "weekly" | "monthly";
  expectedAmount: number; // median of the series
  lastDate: string; // yyyy-mm-dd
  nextDate: string; // projected
  daysUntil: number; // negative = overdue
  biller: boolean;
  accountTag: string | null;
  occurrences: number;
};

export type RadarAlert =
  | { kind: "double_charge"; name: string; amount: number; message: string }
  | { kind: "amount_spike"; name: string; amount: number; message: string }
  | { kind: "new_biller"; name: string; amount: number; message: string };

export type RadarResult = {
  upcoming: RecurringFlow[];
  alerts: RadarAlert[];
};

const DAY_MS = 86_400_000;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Grouping key: resolved merchant when known, else the exact trimmed note. */
function flowKey(t: Transaction): string | null {
  const merchant = resolveMerchant(t.note);
  if (merchant) return `m:${merchant.name}:${t.type}`;
  const note = t.note?.trim();
  if (!note) return null;
  // Unresolved notes only group on an exact (case-folded) match — conservative
  // by design so unrelated one-offs never merge into a fake "subscription".
  return `n:${note.toUpperCase()}:${t.type}`;
}

export function analyzeRecurring(transactions: Transaction[], today = new Date()): RadarResult {
  const todayStr = today.toISOString().slice(0, 10);
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = flowKey(t);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const upcoming: RecurringFlow[] = [];
  const alerts: RadarAlert[] = [];

  for (const [key, list] of groups) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const merchant = resolveMerchant(list[0].note);
    const name = merchant?.name ?? list[0].note ?? "Unknown";
    const biller = !!merchant?.biller;
    const amounts = list.map((t) => t.amount);
    const med = median(amounts);
    const last = list[list.length - 1];

    // -- new recurring biller: first-ever charge from a known biller --
    if (biller && list.length === 1 && daysBetween(last.date, todayStr) <= 35) {
      alerts.push({
        kind: "new_biller",
        name,
        amount: last.amount,
        message: `New recurring biller detected: ${name}`,
      });
      continue;
    }

    // Two biller charges days apart with matching amounts and no rhythm yet —
    // the classic fresh double charge.
    if (
      biller &&
      list.length === 2 &&
      daysBetween(list[0].date, list[1].date) <= 5 &&
      Math.abs(list[0].amount - list[1].amount) <= med * 0.15 &&
      daysBetween(last.date, todayStr) <= 35
    ) {
      alerts.push({
        kind: "double_charge",
        name,
        amount: last.amount,
        message: `${name} charged twice within days`,
      });
      continue;
    }

    // Known billers earn trust faster (3 charges); unresolved notes need 4.
    const minOccurrences = biller ? 3 : 4;
    if (list.length < minOccurrences) continue;

    const intervals: number[] = [];
    for (let i = 1; i < list.length; i++) {
      const d = daysBetween(list[i - 1].date, list[i].date);
      if (d > 0) intervals.push(d);
    }
    // Micro-gaps (< 4 days) are duplicate charges, not the flow's rhythm —
    // exclude them from cadence detection so a double charge can't disguise
    // the underlying monthly cycle.
    const cadenceIntervals = intervals.filter((d) => d >= 4);
    if (cadenceIntervals.length < 2) continue;

    const medInterval = median(cadenceIntervals);
    const cadence: RecurringFlow["cadence"] | null =
      medInterval >= 5 && medInterval <= 9
        ? "weekly"
        : medInterval >= 24 && medInterval <= 38
          ? "monthly"
          : null;
    if (!cadence) continue;

    // Rhythm check: most intervals near the median.
    const tolerance = cadence === "weekly" ? 3 : 8;
    const regular = cadenceIntervals.filter((d) => Math.abs(d - medInterval) <= tolerance).length;
    if (regular / cadenceIntervals.length < 0.6) continue;

    // Amount stability: the flow's recent amounts hover around the median.
    if (Math.abs(last.amount - med) > med * 0.5) {
      // Erratic amounts usually mean it's not a bill — unless it spiked.
      if (last.amount > med * 1.4) {
        alerts.push({
          kind: "amount_spike",
          name,
          amount: last.amount,
          message: `${name} is ${Math.round((last.amount / med - 1) * 100)}% above its usual ~$${med.toFixed(2)}`,
        });
      }
      continue;
    }

    // -- double charge inside the current cycle --
    const cycleStart = addDays(todayStr, -Math.round(medInterval));
    const inCycle = list.filter(
      (t) => t.date >= cycleStart && Math.abs(t.amount - med) <= med * 0.15,
    );
    if (inCycle.length >= 2 && cadence === "monthly") {
      alerts.push({
        kind: "double_charge",
        name,
        amount: last.amount,
        message: `${name} charged ${inCycle.length}× this cycle`,
      });
    }

    // -- amount spike on an otherwise healthy flow --
    if (last.amount > med * 1.4) {
      alerts.push({
        kind: "amount_spike",
        name,
        amount: last.amount,
        message: `${name} is ${Math.round((last.amount / med - 1) * 100)}% above its usual ~$${med.toFixed(2)}`,
      });
    }

    const nextDate = addDays(last.date, Math.round(medInterval));
    const daysUntil = daysBetween(todayStr, nextDate);
    // Show flows due in the next 14 days, or up to 5 days overdue.
    if (daysUntil >= -5 && daysUntil <= 14) {
      upcoming.push({
        key,
        name,
        type: last.type,
        cadence,
        expectedAmount: med,
        lastDate: last.date,
        nextDate,
        daysUntil,
        biller,
        accountTag: last.account_tag,
        occurrences: list.length,
      });
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  return { upcoming, alerts };
}
