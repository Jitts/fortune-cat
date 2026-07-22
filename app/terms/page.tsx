import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/app/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using Fortune Cat — beta status, one-time Pro pricing, what the fortune readings are (and aren't), and your responsibilities.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="21 July 2026">
      <section>
        <h2>1. What Fortune Cat is</h2>
        <p className="mt-3">
          Fortune Cat is a personal finance tracker: it helps you log expenses and income —
          manually or by reading the bank notifications you forward or connect — and shows you
          where your money goes. By creating an account you agree to these terms and our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don&rsquo;t agree, please
          don&rsquo;t use the service.
        </p>
      </section>

      <section>
        <h2>2. Beta status &amp; pricing</h2>
        <p className="mt-3">
          Fortune Cat is currently in <strong>beta</strong>. During the beta, the Pro tier is free
          to unlock — and if you unlock it during the beta, <strong>you keep it</strong> after the
          beta ends, with no future charge for the features included at the time you unlocked.
        </p>
        <p className="mt-3">
          After the beta, Pro is a one-time purchase (currently US$9) — not a subscription, with
          no renewal. A completed purchase is yours permanently. We may change the price or what
          Pro includes for <em>future</em> purchasers; we will never claw back an unlock
          you&rsquo;ve already made. Payments are processed by Stripe. Because the unlock is
          delivered instantly and priced as a one-time payment, refunds are handled case-by-case —
          email us within 14 days if something isn&rsquo;t right.
        </p>
        <p className="mt-3">
          As a beta product, features may change, be added, or be removed as we learn what works.
        </p>
      </section>

      <section>
        <h2>3. Not financial advice</h2>
        <p className="mt-3">
          The daily fortune slip, safe-to-spend figure, budgets, goals, and every other reading in
          Fortune Cat are <strong>informational only</strong>. They are deterministic calculations
          over the data in your own ledger — not investment, tax, legal, or financial advice, and
          not a recommendation to buy, sell, or hold anything. For decisions that matter, consult
          a qualified professional. We are not a bank, a financial institution, or a licensed
          financial adviser, and Fortune Cat holds none of your money.
        </p>
      </section>

      <section>
        <h2>4. Your ledger is yours to confirm</h2>
        <p className="mt-3">
          Auto-capture reads messages and documents using heuristics, and heuristics can misread —
          a wrong amount, a missed date, a duplicate. That&rsquo;s why everything routes through
          Review for your confirmation (or a trust rule you set), and why auto-posted items have
          one-tap undo. Your ledger is a record of what <em>you</em> confirmed, not a bank
          statement, and we don&rsquo;t guarantee parsing accuracy — the Review step is your
          control, so please use it.
        </p>
      </section>

      <section>
        <h2>5. Your responsibilities</h2>
        <ul className="mt-3">
          <li>Keep your login credentials secure, and tell us if you suspect misuse.</li>
          <li>
            Only connect inboxes and forward messages that are <strong>yours</strong> (or that you
            have clear permission to share).
          </li>
          <li>
            Don&rsquo;t attempt to access other users&rsquo; data, probe or overload the service,
            or use it for anything unlawful.
          </li>
          <li>You must be at least 16 to use Fortune Cat.</li>
        </ul>
      </section>

      <section>
        <h2>6. Your content</h2>
        <p className="mt-3">
          Your ledger and everything in it belongs to you. You grant us only the licence needed to
          store and process it to run the service — nothing more. You can export it as CSV or
          delete it entirely, at any time, from Settings.
        </p>
      </section>

      <section>
        <h2>7. Ending things</h2>
        <p className="mt-3">
          You can stop using Fortune Cat and delete your account (and all its data) at any time
          from Settings. We may suspend or terminate accounts that violate these terms or abuse
          the service; where reasonable, we&rsquo;ll warn you first.
        </p>
      </section>

      <section>
        <h2>8. Disclaimers &amp; liability</h2>
        <p className="mt-3">
          Fortune Cat is provided <strong>&ldquo;as is&rdquo;</strong>, and — especially during
          beta — without warranties of uninterrupted availability or error-free operation. To the
          maximum extent permitted by law, we are not liable for indirect or consequential losses,
          or for decisions made in reliance on the app&rsquo;s readings (see section 3). Where
          liability cannot be excluded, it is limited to the amount you paid us in the 12 months
          before the claim. Nothing in these terms limits rights you have under law that cannot be
          contractually limited.
        </p>
      </section>

      <section>
        <h2>9. Changes, law &amp; contact</h2>
        <p className="mt-3">
          If we make material changes to these terms, we&rsquo;ll update the date above and flag
          it in the app; continuing to use the service after that means you accept the updated
          terms. These terms are governed by the laws of Singapore. Questions:{" "}
          <a href="mailto:jitsiong91@gmail.com">jitsiong91@gmail.com</a>.
        </p>
      </section>
    </LegalShell>
  );
}
