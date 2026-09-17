import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FaqSection from "@/app/components/FaqSection";
import Wordmark from "@/app/components/Wordmark";
import {
  HeroLoop,
  SafeToSpend,
  WeekWidget,
} from "@/app/components/landing/Players";
import { FREE_PRO_BETA } from "@/lib/beta";
import { PRO_PRICE } from "@/lib/proFeatures";
import "@/app/components/landing/landing.css";

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
    "A personal expense tracker that fills itself: the SMS and emails your bank already sends become a live cash-flow ledger. No bank login, and you choose how much access to give. Works in any currency worldwide.",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier",
    },
    {
      "@type": "Offer",
      price: "9",
      priceCurrency: "USD",
      description: "Pro — one-time payment, no subscription",
    },
  ],
};

/**
 * The landing page — a Marquee Hero over a Feature Stack, built from the DNA
 * studied at wise.com (see the stamp in landing/landing.css). One uppercase
 * statement, the product moving underneath it, a live widget on a gold band,
 * then one idea per band. Remotion does three jobs here, each with its own
 * rule for when it moves (see landing/Players.tsx).
 *
 * Trust is carried by what the page never shows: there is no bank-shaped
 * field anywhere on it, and the limitation gets the dramatic band.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const go = user ? "/app" : "/signup";
  const cta = user ? "Open app" : "Create your account";

  return (
    <main className="landing">
      <header className="l-head">
        <div className="l-wrap l-head-in">
          <Link href="/" aria-label="Fortune Cat home">
            <Wordmark />
          </Link>
          <nav className="l-nav-mid" aria-label="Site">
            <a href="#widget">How it works</a>
            <a href="#price">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <nav className="l-nav-end" aria-label="Account">
            {user ? (
              <Link href="/app" className="l-pill l-pill-sm">
                Open app
              </Link>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/signup" className="l-pill l-pill-sm">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="l-hero">
        <div className="l-wrap">
          <h1>Your bank already tells you.</h1>
          <p className="l-lede">
            Fortune Cat writes it down. The alerts your bank already sends
            become a live spending picture — with no bank login, because there
            is no field for one.
          </p>
          <div className="l-hero-cta">
            <Link href={go} className="l-pill">
              {cta}
            </Link>
            <a href="#widget" className="l-link">
              See how it works
            </a>
          </div>
          <HeroLoop />
        </div>
      </section>

      <section className="l-band l-band-bright" id="widget">
        <div className="l-wrap l-split">
          <div>
            <h2>Watch one alert become a row.</h2>
            <p className="l-intro">
              A sample week, one bank alert at a time. Two days get no alert,
              and the row is printed blank rather than hidden. The last step
              uploads a statement — and you&rsquo;ll see exactly which blank it
              can fill, and which it can&rsquo;t.
            </p>
            <p>
              Nothing here is faked: this is the same reading the app does with
              your own forwarded messages.
            </p>
          </div>
          <WeekWidget />
        </div>
      </section>

      <section className="l-band">
        <div className="l-wrap">
          <h2>One direction.</h2>
          <p className="l-intro">
            The alert leaves your bank the way it always has. Fortune Cat sits
            at the far end of that trip and reads what arrives. Nothing travels
            back.
          </p>
          <ul className="l-rows">
            <li>
              <b>Your bank</b>
              <span>
                Sends the alert it already sends. Nothing about your bank
                changes.
              </span>
            </li>
            <li>
              <b>Your phone</b>
              <span>
                A one-time shortcut forwards bank SMS to your capture inbox. You
                can see every message it sends, and switch it off from your
                phone.
              </span>
            </li>
            <li>
              <b>Fortune Cat</b>
              <span>
                Reads the amount, the merchant and the date, and files the row.
                The first message from a new sender waits for your approval.
              </span>
            </li>
            <li className="l-return">
              <b>Back to the bank</b>
              <span>
                Nothing. No login, no account link, no screen-scraping — there
                is no access to revoke, because none was given.
              </span>
            </li>
            <li className="l-optional">
              <b>An inbox</b>
              <span>
                Connect an email account and Fortune Cat scans it for receipts.
                That uses an app password from your email provider — a real
                credential, which you can cut off from your provider&rsquo;s
                settings at any time; it stops working whether or not we
                cooperate. Skip it, and Fortune Cat never sees your email at
                all.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="l-band" style={{ paddingTop: 0 }}>
        <div className="l-wrap l-split">
          <div>
            <h2>One number you can actually spend.</h2>
            <p className="l-intro">
              Safe-to-Spend is what is left after the bills due before payday
              and the money you set aside for a goal. It is arithmetic, not
              advice — and every line of it is yours to correct.
            </p>
            <p>
              Sample figures. With Pro, confirming your real balance makes it
              exact rather than estimated.
            </p>
          </div>
          <SafeToSpend />
        </div>
      </section>

      <section className="l-band l-band-deep">
        <div className="l-wrap">
          <h2>It only knows what your bank says.</h2>
          <p className="l-intro">
            Your bank&rsquo;s alerts see every card transaction, and that is the
            backbone. What they don&rsquo;t see, Fortune Cat doesn&rsquo;t
            either — so here is where the gaps are.
          </p>
          <ul className="l-gaps">
            <li>Cash is never captured. Nothing outside your bank sees it.</li>
            <li>
              Some banks don&rsquo;t alert on small amounts, direct debits or
              standing orders.
            </li>
            <li>
              A blank row takes a few seconds to fill by hand, and one statement
              upload — read on your device — backfills a whole month.
            </li>
          </ul>
        </div>
      </section>

      <section className="l-break">
        <div className="l-wrap">
          <p className="l-statement">The whole form is two fields.</p>
          <p>
            Email and a password. There is no field for a bank, and there will
            never be a step that adds one. Free to track; no card to sign up.
          </p>
          <Link href={go} className="l-pill">
            {cta}
          </Link>
        </div>
      </section>

      <section className="l-band l-band-bright" id="price">
        <div className="l-wrap">
          <h2>Two prices, neither of them monthly.</h2>
          <div className="l-price">
            <div>
              <b>Free</b>
              <p>
                Tracking, one capture inbox, statement and receipt upload,
                monthly budgets, your daily fortune slip, Safe-to-Spend, CSV
                export.
              </p>
            </div>
            <div>
              <b>{PRO_PRICE} once</b>
              <p>
                Savings goals, the month-ahead forecast, recurring-bill radar,
                deep analytics, full history, three capture inboxes. Not a
                subscription — there is no renewal.
                {FREE_PRO_BETA &&
                  " During the beta the $9 is waived: beta testers unlock Pro free and keep it."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />

      <footer className="l-foot">
        <div className="l-wrap">
          <div className="l-foot-cols">
            <div>
              <Wordmark size="sm" />
              <p
                style={{
                  marginTop: "0.75rem",
                  maxWidth: "18rem",
                  color: "var(--l-ink-dim)",
                }}
              >
                The money tracker that fills itself from the alerts your bank
                already sends.
              </p>
            </div>
            <div>
              <h3>Product</h3>
              <ul>
                <li>
                  <a href="#widget">How it works</a>
                </li>
                <li>
                  <a href="#price">Pricing</a>
                </li>
                <li>
                  <Link href="/faq">FAQ</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3>Account</h3>
              <ul>
                <li>
                  <Link href="/signup">Sign up</Link>
                </li>
                <li>
                  <Link href="/login">Log in</Link>
                </li>
                <li>
                  <Link href="/feedback">Feedback</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3>Legal</h3>
              <ul>
                <li>
                  <Link href="/privacy">Privacy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="l-foot-note">
            <span>© {new Date().getFullYear()} Fortune Cat</span>
            <span>Data stored in Singapore (AWS ap-southeast-1)</span>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSON_LD) }}
      />
    </main>
  );
}
