import Link from "next/link";
import { PRO_FEATURES } from "@/lib/proFeatures";
import { FREE_PRO_BETA } from "@/lib/beta";

/**
 * The homepage Pro section. Its feature list is the shared lib/proFeatures set,
 * the single source of truth also used by /upgrade — so the two never drift.
 * Every item maps to a real Pro gate in the app (grep `isPro`); nothing is
 * invented for marketing.
 */
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
          {FREE_PRO_BETA && (
            <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              🎁 Free for beta testers right now — unlock it while beta lasts, keep it forever.
            </p>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRO_FEATURES.map((f) => (
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
            {FREE_PRO_BETA ? "See Fortune Cat Pro — free in beta →" : "See Fortune Cat Pro — $9 once →"}
          </Link>
        </div>
      </div>
    </section>
  );
}
