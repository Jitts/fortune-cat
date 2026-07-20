import Link from "next/link";
import Reveal from "@/app/components/Reveal";
import { PRO_FEATURES } from "@/lib/proFeatures";
import { FREE_PRO_BETA } from "@/lib/beta";

/**
 * The homepage Pro section. Its feature list is the shared lib/proFeatures set,
 * the single source of truth also used by /upgrade — so the two never drift.
 * Every item maps to a real Pro gate in the app (grep `isPro`); nothing is
 * invented for marketing. Framed as one "unlock" panel rather than a card grid.
 */
export default function ProShowcase() {
  return (
    <section className="border-t border-line bg-surface-2">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-surface p-8 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.5)] ring-1 ring-line sm:p-12">
          {/* gold leaf glow, top-right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-70 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--gold) 24%, transparent), transparent 62%)",
            }}
          />

          <Reveal className="relative max-w-xl">
            <span className="chip chip-gold text-[11px]">Fortune Cat Pro</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Free tracks it. Pro makes it work for you.
            </h2>
            <p className="mt-3 text-base text-ink-muted">
              One-time unlock —{" "}
              <span className="font-semibold text-ink">$9, forever</span>. No subscription, no
              renewal, no clawing it back next month.
            </p>
            {FREE_PRO_BETA && (
              <p className="mt-3 inline-block rounded-full bg-jade-soft px-3 py-1 text-sm font-semibold text-jade">
                🎁 Free for beta testers right now — unlock it while beta lasts, keep it forever.
              </p>
            )}
          </Reveal>

          <Reveal delay={80} className="relative mt-10">
            <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
              {PRO_FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3.5">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-lg"
                  >
                    {f.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{f.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={140} className="relative mt-10">
            <Link href="/upgrade" className="btn btn-gold px-6 py-3.5 text-sm">
              {FREE_PRO_BETA ? "Unlock Pro — free in beta →" : "See Fortune Cat Pro — $9 once →"}
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
