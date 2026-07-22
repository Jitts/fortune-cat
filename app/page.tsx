import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LandingDemo from "@/app/components/LandingDemo";
import ProShowcase from "@/app/components/ProShowcase";
import ThemeToggle from "@/app/components/ThemeToggle";
import UspSection from "@/app/components/UspSection";
import FaqSection from "@/app/components/FaqSection";
import Reveal from "@/app/components/Reveal";
import ShrineStars from "@/app/components/ShrineStars";
import Wordmark from "@/app/components/Wordmark";
import { FREE_PRO_BETA } from "@/lib/beta";

export const dynamic = "force-dynamic";

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
    "A personal expense tracker that fills itself: forward the SMS and emails your bank already sends and they become a live cash-flow ledger. No bank login — it only ever sees the notification text you forward. Works in any currency worldwide.",
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
    <main className="relative min-h-screen bg-surface-2">
      {/* Gold night sky in Shrine mode — same field as the signed-in app */}
      <ShrineStars />

      <header className="sticky top-0 z-40 border-b border-line/70 bg-surface-2/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/" aria-label="Fortune Cat home">
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <ThemeToggle variant="compact" />
            {user ? (
              <Link href="/app" className="btn btn-gold px-4 py-2 text-sm">
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
                <Link href="/signup" className="btn btn-gold px-4 py-2 text-sm">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        {/* atmospheric gold arc behind the fold */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-24 h-[38rem] w-[38rem] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--gold) 26%, transparent), transparent 62%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted shadow-sm ring-1 ring-line">
                <span aria-hidden className="h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_var(--gold)]" />
                <span className="font-mono uppercase tracking-[0.14em] text-ink-subtle">
                  the tracker that fills itself
                </span>
              </span>
            </Reveal>
            <Reveal delay={70}>
              <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,4.5rem)] font-extrabold leading-[0.98] tracking-tight text-ink">
                Your money{" "}
                <span className="gold-swash whitespace-nowrap">logs itself.</span>
              </h1>
            </Reveal>
            <Reveal delay={130}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
                Fortune Cat reads the SMS, emails, and statements your bank already sends you — no
                bank login, it only ever sees the notification text — and turns them into a live
                cash-flow ledger, in your own currency.
              </p>
            </Reveal>
            <Reveal delay={190}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href={user ? "/app" : "/signup"} className="btn btn-gold px-6 py-3.5 text-sm">
                  {user ? "Open your app" : "Start tracking — it's free"}
                </Link>
                <Link href="/upgrade" className="btn btn-ghost px-6 py-3.5 text-sm">
                  See Pro — $9 once
                </Link>
              </div>
            </Reveal>
            <Reveal delay={250}>
              <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-subtle">
                <span>no bank login</span>
                <span aria-hidden className="text-gold">·</span>
                <span>free to start</span>
                <span aria-hidden className="text-gold">·</span>
                <span>any currency worldwide</span>
              </p>
            </Reveal>
          </div>

          {/* Live capture-loop demo, entirely client-side */}
          <Reveal delay={160} className="md:justify-self-end">
            <LandingDemo />
          </Reveal>
        </div>
      </section>

      <UspSection />
      <ProShowcase />
      <FaqSection />

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-ink-subtle sm:px-8">
          <div className="flex flex-col gap-1">
            <Wordmark size="sm" />
            <span className="font-mono text-xs text-ink-faint">your money logs itself</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/upgrade" className="hover:text-ink">
              {FREE_PRO_BETA ? "Pro — free in beta" : "Pro — $9 once"}
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
