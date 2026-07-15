import Link from "next/link";

/**
 * Every benefit here maps to a real Pro gate in the app (grep `isPro`) — no
 * feature is invented for marketing. Keep this list in sync with the bullets
 * on /upgrade when a new Pro gate is added.
 */
const FEATURES = [
  {
    icon: "🔭",
    title: "Recurring radar",
    desc: "Every recurring bill and subscription detected automatically, with alerts on spikes, double-charges, and new billers.",
  },
  {
    icon: "🗡️",
    title: "Subscription kill-chain",
    desc: "A cancel playbook for every subscription found, plus a running tally of what you've freed per year.",
  },
  {
    icon: "👛",
    title: "Safe-to-spend",
    desc: "See exactly what's yours to spend this month, after bills and goal set-asides — not just your balance.",
  },
  {
    icon: "🎯",
    title: "Fortune Goals",
    desc: "Save toward a goal on a real plan — emergency funds size themselves to six months of your actual spending.",
  },
  {
    icon: "📊",
    title: "Deep analytics",
    desc: "Savings rate and cash flow with period comparisons, a category ranking, and the trend behind the numbers.",
  },
  {
    icon: "🎴",
    title: "Sharper daily fortune",
    desc: "Your slip adds a same-day spending cap, so the reading tells you what to actually do about it.",
  },
  {
    icon: "📜",
    title: "Full history",
    desc: "See every transaction you've ever logged — the free tier only shows your last 10.",
  },
  {
    icon: "📥",
    title: "3 capture inboxes",
    desc: "Connect up to three email inboxes for auto-capture, instead of one.",
  },
];

export default function ProShowcase() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-block rounded-full bg-fortune-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-fortune-700">
            Fortune Cat Pro
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Free tracks it. Pro makes it work for you.
          </h2>
          <p className="mt-2 text-ink-muted">
            One-time unlock — <span className="font-semibold text-ink">$9, forever</span>. No
            subscription, no renewal.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
              <span className="text-2xl" aria-hidden>
                {f.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/upgrade"
            className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-600"
          >
            See Fortune Cat Pro — $9 once →
          </Link>
        </div>
      </div>
    </section>
  );
}
