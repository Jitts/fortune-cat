import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/app/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Fortune Cat collects, uses, and protects your data — no bank logins, on-device document parsing, encrypted credentials, and full export and deletion controls.",
  alternates: { canonical: "/privacy" },
};

/**
 * Every claim on this page is checked against the codebase before shipping —
 * an inaccurate privacy policy is worse than a thin one. If a processing
 * behaviour changes (new processor, new data field, new retention rule),
 * update this page in the same PR.
 */
export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="21 July 2026">
      {/* Plain-English summary up top — the details follow for anyone who wants them. */}
      <section className="rounded-2xl bg-surface p-6 ring-1 ring-line">
        <h2>The short version</h2>
        <ul className="mt-3">
          <li>We never ask for your bank login, and we never see your card number.</li>
          <li>
            Capture works on message text you choose to forward or inboxes you choose to connect —
            read-only, and you can disconnect at any time.
          </li>
          <li>PDFs and screenshots are read on your device; the file itself is never uploaded.</li>
          <li>No advertising, no analytics trackers, no selling data. Ever.</li>
          <li>
            You can export everything as CSV or delete your account — and all its data — yourself,
            from Settings, at any time.
          </li>
        </ul>
      </section>

      <section>
        <h2>1. Who we are</h2>
        <p className="mt-3">
          Fortune Cat (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a personal finance tracker operated
          from Singapore. For anything in this policy — questions, requests, complaints — contact{" "}
          <a href="mailto:jitsiong91@gmail.com">jitsiong91@gmail.com</a>. We aim to respond within
          30 days.
        </p>
        <p className="mt-3">
          This policy covers the Fortune Cat website and app. It applies wherever you use it,
          including under Singapore&rsquo;s PDPA and, for users in the European Economic Area and
          the UK, the GDPR.
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <ul className="mt-3">
          <li>
            <strong>Account:</strong> your email address and a password (stored hashed by our
            authentication provider — we never see it in plain text), or a Microsoft sign-in if
            you connect an Outlook inbox.
          </li>
          <li>
            <strong>Profile:</strong> the country, currency, locale, and timezone you pick at
            onboarding.
          </li>
          <li>
            <strong>Your financial entries:</strong> the transactions, budgets, goals, recurring
            bills, and balance anchors you create or confirm — amount, category, date, and any
            note you add.
          </li>
          <li>
            <strong>Capture data:</strong> if you connect an inbox — its address, host settings,
            and an app password we encrypt before storing (AES-256-GCM); from scanned messages —
            the sender, subject, date, detected amount, and a short text snippet (up to 200
            characters). If you enable SMS forwarding — the forwarded message text. If you upload
            a statement or receipt — only the extracted text; PDFs and images are read in your
            browser and never uploaded.
          </li>
          <li>
            <strong>Payment status:</strong> whether you&rsquo;ve unlocked Pro. Payments are
            processed by Stripe — your card details go to Stripe directly and never touch our
            servers.
          </li>
          <li>
            <strong>Security records:</strong> an audit log of significant account actions (e.g.
            connecting an inbox, blocking a sender) tied to your account, and short-lived,
            self-deleting rate-limit counters that contain no personal data.
          </li>
        </ul>
        <p className="mt-3">
          We do <strong>not</strong> collect your bank credentials, card numbers, contacts,
          location, or browsing behaviour. There are no analytics or advertising trackers anywhere
          in the product.
        </p>
      </section>

      <section>
        <h2>3. How capture works — and what we never see</h2>
        <p className="mt-3">
          Fortune Cat&rsquo;s auto-capture reads the notifications your bank already sends you,
          not your bank account:
        </p>
        <ul className="mt-3">
          <li>
            <strong>Email:</strong> a connected inbox is accessed read-only, to look for
            receipt-like messages. Microsoft inboxes use Microsoft&rsquo;s official sign-in with a
            read-only mail permission; we never receive your Microsoft password.
          </li>
          <li>
            <strong>SMS:</strong> your phone forwards messages via a shortcut you set up, using a
            private token you can rotate or revoke at any time. Messages that don&rsquo;t look
            like transactions are discarded.
          </li>
          <li>
            <strong>Documents:</strong> statements and receipts are parsed on your device. Only
            the extracted text reaches our servers — never the file.
          </li>
          <li>
            <strong>Currency conversion:</strong> for foreign-currency captures we fetch the
            exchange rate from Frankfurter (European Central Bank reference rates). Only the two
            currency codes are sent — never your amounts or any personal data.
          </li>
        </ul>
        <p className="mt-3">
          Nothing enters your ledger without a rule you set (trusted senders) or your explicit
          confirmation in Review — and auto-posted items always have one-tap undo.
        </p>
      </section>

      <section>
        <h2>4. Why we process it (legal bases)</h2>
        <ul className="mt-3">
          <li>
            <strong>To run the service</strong> (contract): storing your ledger, computing your
            daily fortune slip and analytics, syncing across devices.
          </li>
          <li>
            <strong>Because you asked us to</strong> (consent): scanning an inbox you connected or
            SMS you forward. Withdrawing is one click — disconnect the inbox or disable
            forwarding, any time.
          </li>
          <li>
            <strong>To keep the service safe</strong> (legitimate interest): audit logs,
            rate-limiting against brute-force attacks, and anonymous spam-sender statistics
            (domain and country only — never linked to you; see section 5).
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Who else processes your data</h2>
        <ul className="mt-3">
          <li>
            <strong>Supabase</strong> — hosts our database and authentication.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the application.
          </li>
          <li>
            <strong>Stripe</strong> — processes payments; they receive your payment details, we
            receive only the payment status.
          </li>
          <li>
            <strong>Microsoft</strong> — only if you connect an Outlook inbox, under a read-only
            mail permission you grant on Microsoft&rsquo;s own consent screen.
          </li>
          <li>
            <strong>Frankfurter</strong> — exchange rates only; receives currency codes, nothing
            personal.
          </li>
        </ul>
        <p className="mt-3">
          That&rsquo;s the whole list. We don&rsquo;t sell or share your data with advertisers or
          data brokers. When users block or trust an email sender, we keep an{" "}
          <strong>anonymous</strong> tally per sender domain and country — it contains no user
          identifiers of any kind and helps protect everyone from spam senders.
        </p>
      </section>

      <section>
        <h2>6. Where your data lives</h2>
        <p className="mt-3">
          Your data is stored in Supabase&rsquo;s Singapore region (AWS ap-southeast-1), with the
          application hosted on Vercel. If you use Fortune Cat from outside Singapore, your data
          is transferred to and stored in Singapore; our providers rely on standard contractual
          safeguards for such international transfers.
        </p>
      </section>

      <section>
        <h2>7. How long we keep it</h2>
        <p className="mt-3">
          For as long as you have an account. Deleting your account (Settings → Danger zone)
          permanently removes your ledger, budgets, goals, captures, inbox connections, tokens,
          audit logs, and profile — everything tied to your account, immediately. Anonymous
          sender statistics contain nothing traceable to you and are unaffected.
        </p>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p className="mt-3">Wherever you are, you can:</p>
        <ul className="mt-3">
          <li>
            <strong>Access &amp; export</strong> — download your full transaction history as CSV
            from Settings.
          </li>
          <li>
            <strong>Correct</strong> — every entry is editable in the app.
          </li>
          <li>
            <strong>Delete</strong> — erase your account and all its data yourself, from Settings.
          </li>
          <li>
            <strong>Withdraw consent</strong> — disconnect inboxes or disable SMS forwarding at
            any time.
          </li>
        </ul>
        <p className="mt-3">
          If you&rsquo;re in the EEA or UK, these correspond to your GDPR rights (access,
          rectification, erasure, portability, objection), and you may also lodge a complaint with
          your local supervisory authority. Singapore users have equivalent rights under the PDPA.
          For anything you can&rsquo;t do in-app, email{" "}
          <a href="mailto:jitsiong91@gmail.com">jitsiong91@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>9. Security</h2>
        <p className="mt-3">
          Inbox credentials are encrypted at rest (AES-256-GCM) and decrypted only at the moment
          of a scan. Every table is protected by row-level security so accounts are isolated from
          each other at the database layer, login endpoints are rate-limited, and significant
          actions are audit-logged. If a breach ever affects your personal data, we will notify
          you and the relevant authorities as required by law.
        </p>
      </section>

      <section>
        <h2>10. Cookies</h2>
        <p className="mt-3">
          We use only the strictly-necessary cookies that keep you signed in. There are no
          tracking, analytics, or advertising cookies — which is why you don&rsquo;t see a cookie
          banner.
        </p>
      </section>

      <section>
        <h2>11. Children, changes &amp; contact</h2>
        <p className="mt-3">
          Fortune Cat is not directed at children under 16, and we don&rsquo;t knowingly collect
          their data. If we change this policy in a way that matters, we&rsquo;ll update the date
          at the top and flag it in the app. Questions or requests:{" "}
          <a href="mailto:jitsiong91@gmail.com">jitsiong91@gmail.com</a>. See also our{" "}
          <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalShell>
  );
}
