import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LandingDemo from "@/app/components/LandingDemo";
import ProShowcase from "@/app/components/ProShowcase";
import ThemeToggle from "@/app/components/ThemeToggle";
import UspSection from "@/app/components/UspSection";
import FaqSection from "@/app/components/FaqSection";
import Reveal from "@/app/components/Reveal";
import ShrineStars from "@/app/components/ShrineStars";
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
      <header className="sticky top-0 z-40 border-b border-line/60 bg-surface-2/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-ink">🐱 Fortune Cat</span>
          <nav className="flex items-center gap-3 text-sm">
            <ThemeToggle variant="compact" />
            {user ? (
              <Link
                href="/app"
                className="pressable rounded-lg bg-action px-4 py-2 font-semibold text-white hover:bg-action/90"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login" className="font-medium text-ink-muted hover:text-ink">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="pressable rounded-lg bg-action px-4 py-2 font-semibold text-white hover:bg-action/90"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
              the tracker that fills itself
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-4 text-balance text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">
              Your money <span className="gold-swash">logs itself.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 text-pretty text-lg text-ink-muted">
              Fortune Cat reads the SMS, emails, and statements your bank already sends you — no
              bank login, it only ever sees the notification text — and turns them into a live
              cash-flow ledger, in your own currency.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={user ? "/app" : "/signup"}
                className="pressable rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600"
              >
                {user ? "Open your app" : "Start tracking — it's free"}
              </Link>
              <Link
                href="/upgrade"
                className="pressable rounded-lg px-5 py-3 text-sm font-semibold text-ink-muted ring-1 ring-line hover:bg-surface-3"
              >
                See Pro
              </Link>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-6 font-mono text-xs text-ink-faint">
              no bank login · free to start · Pro is US$9 once
            </p>
          </Reveal>
        </div>

        {/* Live capture-loop demo, entirely client-side */}
        <Reveal delay={150}>
          <LandingDemo />
        </Reveal>
      </section>

      <UspSection />
      <ProShowcase />
      <FaqSection />

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-ink-faint">
          <span>🐱 Fortune Cat · your money logs itself</span>
          <nav className="flex gap-4">
            <Link href="/upgrade" className="hover:text-ink-muted">
              {FREE_PRO_BETA ? "Pro — free in beta" : "Pro — $9 once"}
            </Link>
            <Link href="/signup" className="hover:text-ink-muted">
              Sign up free
            </Link>
            <Link href="/login" className="hover:text-ink-muted">
              Log in
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
