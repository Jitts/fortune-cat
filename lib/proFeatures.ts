// The Pro pitch — one source of truth for the marketing homepage and /upgrade,
// so they never drift. Every item maps to a real, shipped Pro-gated feature
// (see the isPro checks across the app); copy is written for a global audience,
// no country- or bank-specific naming.

export type ProFeature = { icon: string; title: string; desc: string };

export const PRO_PRICE = "US$9";
export const PRO_PRICE_LABEL = "US$9 one-time";

export const PRO_TAGLINE = "One payment. Every engine unlocked, for good.";

/**
 * Free vs Pro, as a comparison matrix. Same single-source-of-truth rule as
 * PRO_FEATURES: every row maps to a real gate in the app, so the marketing
 * table can't drift from what the product actually does.
 *
 * `true` renders as included, `false` as not included, a string as its own
 * value ("1", "Last 10"). Values are kept SHORT — the two value columns have
 * to stay narrow enough that the whole table fits a 360px phone with no
 * horizontal scroll.
 */
export type PlanValue = boolean | string;
export type PlanRow = { label: string; note?: string; free: PlanValue; pro: PlanValue };
export type PlanGroup = { title: string; rows: PlanRow[] };

export const PLAN_COMPARISON: PlanGroup[] = [
  {
    title: "Tracking the money",
    rows: [
      { label: "Log expenses and income by hand", free: true, pro: true },
      { label: "Auto-capture from forwarded SMS and email", free: true, pro: true },
      { label: "Capture inboxes", free: "1", pro: "3" },
      { label: "Transaction history", free: "Last 10", pro: "All" },
      { label: "Daily fortune slip", free: true, pro: true },
      { label: "Export everything as CSV", free: true, pro: true },
    ],
  },
  {
    title: "Making it work for you",
    rows: [
      { label: "Safe-to-Spend", note: "what's truly yours to spend", free: false, pro: true },
      { label: "Fortune Goals", note: "savings goals and emergency fund", free: false, pro: true },
      { label: "The month ahead", note: "your balance, projected daily", free: false, pro: true },
      { label: "Recurring radar", note: "learns your bills, flags spikes", free: false, pro: true },
      {
        label: "Subscription kill-chain",
        note: "cancel steps, and what you free up",
        free: false,
        pro: true,
      },
      { label: "Deep analytics", note: "savings rate, trends, categories", free: false, pro: true },
      { label: "Daily spend target on your slip", free: false, pro: true },
    ],
  },
];

export const PRO_FEATURES: ProFeature[] = [
  {
    icon: "👛",
    title: "Safe-to-Spend",
    desc: "See exactly what's yours to spend this month — after your bills, goals and set-asides are accounted for.",
  },
  {
    icon: "🎯",
    title: "Fortune Goals",
    desc: "Set savings goals and an emergency fund sized to your real spending, and watch each one fill as you save.",
  },
  {
    icon: "🔮",
    title: "The month ahead",
    desc: "Projects your balance for every day ahead from the bills and paydays it already learned — so you see the leanest day before it arrives, not after.",
  },
  {
    icon: "🔭",
    title: "Recurring radar",
    desc: "Learns your regular bills and subscriptions, predicts what's due next, and flags spikes, double charges and new billers.",
  },
  {
    icon: "🗡️",
    title: "Subscription kill-chain",
    desc: "Surfaces what you're subscribed to, hands you the cancel steps, and tallies the money you free up.",
  },
  {
    icon: "📈",
    title: "Deep analytics",
    desc: "Your savings rate, cash-flow trends, top categories and month-over-month comparisons — the story behind the numbers.",
  },
  {
    icon: "🎴",
    title: "Actionable daily reading",
    desc: "Each day's fortune comes with a concrete spend target for the day, so the week closes ahead.",
  },
  {
    icon: "📜",
    title: "Full history",
    desc: "Every transaction you've ever logged — the free tier keeps only your last 10.",
  },
  {
    icon: "📥",
    title: "3 capture inboxes",
    desc: "Connect up to three inboxes for auto-capture, instead of one on the free tier.",
  },
];
