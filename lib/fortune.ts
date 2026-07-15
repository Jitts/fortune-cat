import { analyzeRecurring } from "@/lib/recurring";
import { computeSafeToSpend } from "@/lib/safeToSpend";
import { catState, type CatState } from "@/app/app/components/FortuneCat";
import { formatCurrency } from "@/lib/format";
import type { BalanceAnchor, Category, FortuneGoal, SlipSeverity, Transaction } from "@/lib/types";

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
  detail: string; // one concrete observation — nearest bill, or a category-pace read
  recommendation: string | null; // Pro-only actionable daily cap; null on free or no safe signal
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

/**
 * The top expense category's daily pace this month vs. its own trailing
 * average (up to the last 3 complete months) — "Food sits 12% below its
 * usual path." Returns null when there's no category to lead with or no
 * history yet to compare against (a brand-new category isn't "off pace",
 * it just has no pace on record).
 */
function categoryPaceSignal(
  transactions: Transaction[],
  categories: Category[],
  today: Date,
): { categoryName: string; pctDiff: number; direction: "above" | "below" } | null {
  const thisMonth = monthKey(today);
  const dayOfMonth = today.getDate();

  const thisMonthByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.category_id) continue;
    if (monthKey(new Date(`${t.date}T00:00:00`)) !== thisMonth) continue;
    thisMonthByCategory.set(t.category_id, (thisMonthByCategory.get(t.category_id) ?? 0) + t.amount);
  }

  let topId: string | null = null;
  let topTotal = 0;
  for (const [id, total] of thisMonthByCategory) {
    if (total > topTotal) {
      topId = id;
      topTotal = total;
    }
  }
  if (!topId) return null;

  const thisMonthPace = topTotal / Math.max(1, dayOfMonth);

  const baselinePaces: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = monthKey(monthStart);
    const daysInThatMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    let total = 0;
    let hasAny = false;
    for (const t of transactions) {
      if (t.type !== "expense" || t.category_id !== topId) continue;
      if (monthKey(new Date(`${t.date}T00:00:00`)) !== key) continue;
      total += t.amount;
      hasAny = true;
    }
    if (hasAny) baselinePaces.push(total / daysInThatMonth);
  }
  if (baselinePaces.length === 0) return null;

  const baseline = baselinePaces.reduce((s, v) => s + v, 0) / baselinePaces.length;
  if (baseline <= 0) return null;

  const pctDiff = Math.round(((thisMonthPace - baseline) / baseline) * 100);
  if (pctDiff === 0) return null;

  return {
    categoryName: categories.find((c) => c.id === topId)?.name ?? "Spending",
    pctDiff: Math.abs(pctDiff),
    direction: pctDiff < 0 ? "below" : "above",
  };
}

/**
 * The concrete second line. Priority: a bill due very soon (most urgent) →
 * the category-pace read (most specific) → the original generic fallback
 * (any upcoming bill, else burn pace, else "quiet ledger") for brand-new
 * accounts with no category history yet.
 */
function detailLine(
  transactions: Transaction[],
  categories: Category[],
  s: MonthSignals,
  today: Date,
): string {
  const { upcoming } = analyzeRecurring(transactions, today);

  const urgentBill = upcoming.find((f) => f.type === "expense" && f.daysUntil <= 2);
  if (urgentBill) {
    const when =
      urgentBill.daysUntil <= 0 ? "due now" : urgentBill.daysUntil === 1 ? "due tomorrow" : `due in ${urgentBill.daysUntil} days`;
    return `${urgentBill.name} (~${formatCurrency(urgentBill.expectedAmount)}) is ${when}.`;
  }

  const pace = categoryPaceSignal(transactions, categories, today);
  if (pace) {
    return `${pace.categoryName} sits ${pace.pctDiff}% ${pace.direction} its usual path.`;
  }

  const anyBill = upcoming.find((f) => f.type === "expense");
  if (anyBill) {
    const when =
      anyBill.daysUntil <= 0 ? "due now" : anyBill.daysUntil === 1 ? "due tomorrow" : `due in ${anyBill.daysUntil} days`;
    return `${anyBill.name} (~${formatCurrency(anyBill.expectedAmount)}) is ${when}.`;
  }
  if (s.outTotal > 0) return `You're burning ${formatCurrency(s.burnPerDay)} a day this month.`;
  return "Nothing captured yet this month — the ledger is quiet.";
}

/**
 * The green, actionable line — Pro only, since it leans on the Safe-to-Spend
 * engine. Reuses that engine's own "rest of the month" figure spread evenly
 * over the days left, so it's the same honest number as the pouch, just
 * framed against the nearer weekly checkpoint rather than month-end. Null
 * when there's no Pro signal or nothing safe left to recommend spending.
 */
function weeklyRecommendation(
  transactions: Transaction[],
  goals: FortuneGoal[],
  anchor: BalanceAnchor | null,
  today: Date,
): string | null {
  const sts = computeSafeToSpend({ transactions, goals, anchor, today });
  if (sts.safe <= 0) return null;

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeftInMonth = daysInMonth - today.getDate() + 1;
  const dailyCap = sts.safe / Math.max(1, daysLeftInMonth);
  if (dailyCap <= 0) return null;

  return `Keep today under ${formatCurrency(dailyCap)} and the week closes ahead.`;
}

export function computeSlip(
  transactions: Transaction[],
  categories: Category[],
  isPro: boolean,
  goals: FortuneGoal[],
  anchor: BalanceAnchor | null,
  today = new Date(),
): FortuneSlip {
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
    detail: detailLine(transactions, categories, s, today),
    recommendation: isPro ? weeklyRecommendation(transactions, goals, anchor, today) : null,
  };
}
