import { analyzeRecurring } from "@/lib/recurring";
import { catState, type CatState } from "@/app/app/components/FortuneCat";
import { formatCurrency } from "@/lib/format";
import type { SlipSeverity, Transaction } from "@/lib/types";

/**
 * The daily fortune slip (rules, no LLM, no randomness): a once-a-day reading
 * whose face is a pure deterministic function of the local date + this month's
 * captured cash-flow signals. Severity is derived from the SAME signals that
 * drive the cat's mood (lib .../FortuneCat catState), so the slip and the cat
 * can never contradict each other. The date only selects which month/day we
 * read and rotates the flavour wording — same day + same data ⇒ identical slip.
 */

export type FortuneSlip = {
  severity: SlipSeverity;
  fortuneWord: string; // 大吉 / 吉 / 平 / 小凶
  headline: string; // English-first
  detail: string; // one concrete money observation
};

const FORTUNE_WORD: Record<SlipSeverity, string> = {
  great: "大吉",
  good: "吉",
  even: "平",
  caution: "小凶",
};

// Deterministic day seed (local date) — used only to rotate equivalent
// phrasings so the slip feels fresh day to day without ever being random.
function daySeed(today: Date): number {
  return Math.floor(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000,
  );
}

function pick<T>(options: T[], seed: number): T {
  return options[((seed % options.length) + options.length) % options.length];
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

type MonthSignals = {
  inTotal: number;
  outTotal: number;
  net: number;
  savingsRate: number | null; // whole-number percent, net / income
  burnPerDay: number;
  burnDelta: number | null; // percent vs last month's daily pace
};

/** This-month cash-flow signals — mirrors the reducer in PulseCard. */
function monthSignals(transactions: Transaction[], today: Date): MonthSignals {
  const thisMonth = monthKey(today);
  const lastMonth = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const dayOfMonth = today.getDate();

  let inTotal = 0;
  let outTotal = 0;
  let lastMonthOut = 0;

  for (const t of transactions) {
    const d = new Date(`${t.date}T00:00:00`);
    const key = monthKey(d);
    if (key === thisMonth) {
      if (t.type === "income") inTotal += t.amount;
      else outTotal += t.amount;
    } else if (key === lastMonth && t.type === "expense") {
      lastMonthOut += t.amount;
    }
  }

  const burnPerDay = dayOfMonth > 0 ? outTotal / dayOfMonth : 0;
  const lastMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const lastBurnPerDay = lastMonthDays > 0 ? lastMonthOut / lastMonthDays : 0;
  const burnDelta =
    lastBurnPerDay > 0 ? Math.round(((burnPerDay - lastBurnPerDay) / lastBurnPerDay) * 100) : null;
  const net = inTotal - outTotal;
  const savingsRate = inTotal > 0 ? Math.round((net / inTotal) * 100) : null;

  return { inTotal, outTotal, net, savingsRate, burnPerDay, burnDelta };
}

function severityFor(state: CatState, savingsRate: number | null): SlipSeverity {
  if (state === "burning") return "caution";
  if (state === "even") return "even";
  // saving
  return savingsRate != null && savingsRate >= 20 ? "great" : "good";
}

/** The concrete second line: the nearest upcoming bill, else the burn pace. */
function detailLine(transactions: Transaction[], s: MonthSignals, today: Date): string {
  const { upcoming } = analyzeRecurring(transactions, today);
  const nextBill = upcoming.find((f) => f.type === "expense");
  if (nextBill) {
    const when =
      nextBill.daysUntil <= 0
        ? "due now"
        : nextBill.daysUntil === 1
          ? "due tomorrow"
          : `due in ${nextBill.daysUntil} days`;
    return `${nextBill.name} (~${formatCurrency(nextBill.expectedAmount)}) is ${when}.`;
  }
  if (s.outTotal > 0) return `You're burning ${formatCurrency(s.burnPerDay)} a day this month.`;
  return "Nothing captured yet this month — the ledger is quiet.";
}

export function computeSlip(transactions: Transaction[], today = new Date()): FortuneSlip {
  const s = monthSignals(transactions, today);
  const state = catState(s.net, s.burnDelta);
  const severity = severityFor(state, s.savingsRate);
  const seed = daySeed(today);

  let headline: string;
  switch (severity) {
    case "great":
      headline = pick(
        [
          `A prosperous day — you're keeping ${s.savingsRate}% of what comes in.`,
          `The coin beckons: ${s.savingsRate}% of your income stayed put this month.`,
          `Fortune smiles — ${formatCurrency(s.net)} saved so far this month.`,
        ],
        seed,
      );
      break;
    case "good":
      headline = pick(
        [
          `Steady fortune — you're ahead by ${formatCurrency(s.net)} this month.`,
          `The cat is content: more came in than went out this month.`,
          s.burnDelta != null && s.burnDelta <= 0
            ? `Good pace — spending ${Math.abs(s.burnDelta)}% below last month.`
            : `Money in leads money out — keep the rhythm.`,
        ],
        seed,
      );
      break;
    case "even":
      headline = pick(
        [
          `Balance holds — money in and out are near even this month.`,
          `The cat watches — you're breaking even for now.`,
          `Steady as she goes — no gain, no loss this month yet.`,
        ],
        seed,
      );
      break;
    case "caution":
    default:
      headline =
        s.net < 0
          ? pick(
              [
                `Ears back — you're ${formatCurrency(-s.net)} in the red this month.`,
                `Guard your coin — out is beating in by ${formatCurrency(-s.net)}.`,
              ],
              seed,
            )
          : pick(
              [
                `Mind the pace — you're spending ${s.burnDelta}% faster than last month.`,
                `The cat's ears twitch — this month's burn is running hot.`,
              ],
              seed,
            );
      break;
  }

  return {
    severity,
    fortuneWord: FORTUNE_WORD[severity],
    headline,
    detail: detailLine(transactions, s, today),
  };
}
