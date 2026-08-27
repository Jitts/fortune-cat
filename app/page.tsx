import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProShowcase from "@/app/components/ProShowcase";
import FaqSection from "@/app/components/FaqSection";
import Reveal from "@/app/components/Reveal";
import ShrineStars from "@/app/components/ShrineStars";
import Wordmark from "@/app/components/Wordmark";
import ShrineOmikuji from "@/app/components/ShrineOmikuji";
import ShrineCatMonth from "@/app/components/ShrineCatMonth";
import ShrineDaruma from "@/app/components/ShrineDaruma";
import ShrineLanterns from "@/app/components/ShrineLanterns";
import { FREE_PRO_BETA } from "@/lib/beta";
import { PRO_PRICE } from "@/lib/proFeatures";

export const dynamic = "force-dynamic";

/**
 * The landing page — "Night Shrine, playable" (design direction C3).
 *
 * Four things on this page are live, and each one runs the product's real
 * logic rather than a marketing imitation: the omikuji draw, the cat reacting
 * to a month via `lib/catState`, the daruma's second eye filling on a Fortune
 * Goal, and the capture streak. A visitor has used the thing before they are
 * asked to decide anything.
 *
 * The page is DARK-ALWAYS: the `dark` class on <main> flips every token
 * locally (globals.css declares `@custom-variant dark (&:where(.dark, .dark
 * *))`), so the shrine renders the same at noon as at midnight without
 * touching lib/theme.ts or the no-flash script. That is why there is no
 * ThemeToggle in this header — the signed-in app still has one.
 */

// What Fortune Cat is, for search engines and AI assistants (FAQPage JSON-LD
// lives in FaqSection, fed by the same copy users read).
const APP_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Fortune Cat",
  url: "https://fortune-cat-nu.vercel.app",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "A personal expense tracker that fills itself: the SMS and emails your bank already sends become a live cash-flow ledger. No bank login, and you choose how much access to give. Works in any currency worldwide.",
  offers: [
    { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tier" },
    {
      "@type": "Offer",
      price: "9",
      priceCurrency: "USD",
      description: "Pro — one-time payment, no subscription",
    },
  ],
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    // `text-ink` is not decorative: <body> resolves its `color` from the LIGHT
    // scope, so without re-stating it here every unclassed run of text inside
    // the shrine inherits near-black ink onto a midnight background.
    <main className="dark relative min-h-screen bg-surface-2 text-ink">
      <ShrineStars />

      <header className="relative z-40 border-b border-line/60 bg-surface-2/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Fortune Cat home">
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-3 text-sm sm:gap-5">
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-ink-subtle lg:inline">
              everything here is live — touch it
            </span>
            {user ? (
              <Link href="/app" className="btn btn-gold px-5 py-2.5 text-sm">
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-lg px-3 py-2 font-medium text-ink-muted hover:text-ink sm:inline-block"
                >
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-gold px-5 py-2.5 text-sm">
                  Enter
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ===== Hero — draw your fortune ===== */}
      <section className="relative z-10 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-40 h-[38rem] opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse 60% 100% at 50% 100%, color-mix(in oklab, var(--seal) 34%, transparent), transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[54rem] -translate-x-1/2 opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--gold) 20%, transparent), transparent 66%)",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 md:grid-cols-[1.02fr_0.98fr] md:py-24">
          <div>
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-gold">
                no sign-up — just pull the cord
              </p>
            </Reveal>
            <Reveal delay={70}>
              <h1 className="leaf-text mt-6 font-display text-[clamp(3rem,8vw,6rem)] font-extrabold leading-[0.88] tracking-tight">
                Draw your
                <br />
                fortune.
              </h1>
            </Reveal>
            <Reveal delay={130}>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-muted">
                This is the real ritual, running on sample figures. Shake the box and read the slip
                — then scroll on and set the month, and watch the cat&apos;s face change. That face
                is pure arithmetic, not decoration.
              </p>
            </Reveal>
            <Reveal delay={190}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href={user ? "/app" : "/signup"} className="btn btn-gold px-6 py-3.5 text-sm">
                  {user ? "Open your app" : "Begin — it's free"}
                </Link>
                <Link href="/upgrade" className="btn btn-ghost px-6 py-3.5 text-sm">
                  {FREE_PRO_BETA ? "See Pro — free in beta" : `See Pro — ${PRO_PRICE} once`}
                </Link>
              </div>
            </Reveal>
            <Reveal delay={250}>
              <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-subtle">
                <span>no bank login</span>
                <span aria-hidden className="text-gold">
                  ·
                </span>
                <span>free to start</span>
                <span aria-hidden className="text-gold">
                  ·
                </span>
                <span>any currency worldwide</span>
              </p>
            </Reveal>
          </div>

          <Reveal delay={160}>
            <ShrineOmikuji />
          </Reveal>
        </div>
      </section>

      {/* ===== The cat is the arithmetic ===== */}
      <section className="relative z-10 border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-24">
          <Reveal>
            <ShrineCatMonth />
          </Reveal>
        </div>
      </section>

      {/* ===== Make a wish ===== */}
      <section className="relative z-10 border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 md:py-24">
          <Reveal>
            <ShrineDaruma />
          </Reveal>
        </div>
      </section>

      {/* ===== The streak ===== */}
      <section className="relative z-10 border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <Reveal>
            <ShrineLanterns />
          </Reveal>
        </div>
      </section>

      {/* Pricing + FAQ stay as they are — PlanComparison is the single source of
          truth for the tiers, and FaqSection carries the FAQPage JSON-LD. */}
      <div className="relative z-10">
        <ProShowcase />
        <FaqSection />
      </div>

      {/* ===== Close ===== */}
      <section className="relative z-10 overflow-hidden border-t border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[42rem] -translate-x-1/2 opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--gold) 22%, transparent), transparent 66%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-24 text-center sm:px-8">
          <Reveal>
            <h2 className="leaf-text mx-auto max-w-3xl font-display text-[clamp(2.4rem,6vw,5rem)] font-extrabold leading-[0.9] tracking-tight">
              You just used it.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mx-auto mt-7 max-w-lg text-lg leading-relaxed text-ink-muted">
              Everything above runs on sample figures. Point it at your own inbox and the numbers
              become yours — free to start, and{" "}
              {FREE_PRO_BETA ? "Pro is free while the beta runs" : `${PRO_PRICE} once for Pro`}.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href={user ? "/app" : "/signup"} className="btn btn-gold px-7 py-4 text-sm">
                {user ? "Open your app" : "Begin — it's free"}
              </Link>
              <Link href="/upgrade" className="btn btn-ghost px-6 py-4 text-sm">
                See what Pro adds
              </Link>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">
              no card · no bank login · export or delete any time
            </p>
          </Reveal>
        </div>
      </section>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-ink-subtle sm:px-8">
          <div className="flex flex-col gap-1">
            <Wordmark size="sm" />
            <span className="font-mono text-xs text-ink-faint">your money logs itself</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/upgrade" className="hover:text-ink">
              {FREE_PRO_BETA ? "Pro — free in beta" : `Pro — ${PRO_PRICE} once`}
            </Link>
            <Link href="/signup" className="hover:text-ink">
              Sign up free
            </Link>
            <Link href="/login" className="hover:text-ink">
              Log in
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSON_LD) }}
      />
    </main>
  );
}
