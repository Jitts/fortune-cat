// The Pro pitch — one source of truth for the marketing homepage and /upgrade,
// so they never drift. Every item maps to a real, shipped Pro-gated feature
// (see the isPro checks across the app); copy is written for a global audience,
// no country- or bank-specific naming.

export type ProFeature = { icon: string; title: string; desc: string };

export const PRO_PRICE = "$9";
export const PRO_PRICE_LABEL = "$9 one-time";

export const PRO_TAGLINE = "One payment. Every engine unlocked, for good.";

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
