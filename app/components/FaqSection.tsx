import Reveal from "@/app/components/Reveal";
import { FREE_PRO_BETA } from "@/lib/beta";

/**
 * Landing-page FAQ. One array feeds both the visible <details> list and the
 * FAQPage JSON-LD, so search engines / AI assistants read exactly what users
 * read. Answers are answer-first: the opening sentence stands alone.
 */

const FAQS = [
  {
    q: "How does Fortune Cat log transactions automatically?",
    a: "Three ways, and you pick which. Upload a statement, a PDF receipt, or a photo of one — those are read on your device before anything is sent. Forward your bank's SMS using a one-time shortcut on your phone. Or connect an email inbox and let Fortune Cat scan it for receipts. None of them involve a bank login. The first message from a new sender waits in a review queue for your approval; once you trust that sender, later ones post themselves.",
  },
  {
    q: "Do I need to connect my bank account?",
    a: "No — Fortune Cat never asks for a bank login, and there is no account linking or screen-scraping. It works from what your bank already sends you: the SMS alerts you forward, the statements you upload, or the receipt emails sitting in an inbox you choose to connect.",
  },
  {
    q: "What can Fortune Cat see if I connect my email?",
    a: "More than you might assume, so here it is plainly. Fortune Cat signs in to that inbox and reads your recent messages looking for transaction receipts. Anything that isn't a transaction is discarded the moment it has been checked — never stored, never logged. What gets kept is only what matched: the sender, subject, date, amount, and a snippet of up to 200 characters. The app password you provide is a credential your email provider doesn't let anyone narrow: it can reach any folder and send mail as you. Fortune Cat only ever reads, and it is encrypted before it is stored. But you shouldn't have to take that on trust — you can delete that password from your own provider's settings at any time, and it stops working immediately, whether or not we cooperate. If that's more access than you want to give, you don't have to give it: SMS forwarding and statement upload need no access to your email at all.",
  },
  {
    q: "Will it catch everything I spend?",
    a: "Not quite everything, and it's worth knowing where the gaps are. Your bank's own alerts are the backbone — they see every card transaction, so that is what SMS forwarding and inbox scanning mostly work from. Cash is never captured; nothing outside your bank sees it. Some banks don't alert on small amounts, direct debits or standing orders, and those slip past too. Receipts from shops and services add useful detail, but they aren't needed for the amount to land, because the bank alert already covered that purchase. Anything missed takes a few seconds to add by hand, and one statement upload backfills a whole month at once.",
  },
  {
    q: "Is my financial data safe?",
    a: "Your transactions are isolated at the database level with row-level security, so no other account can read them. If you connect an inbox, that app password is encrypted with AES-256-GCM before it is saved, and you can revoke it from your provider's settings without going through us. Your data is stored in Singapore (AWS ap-southeast-1). You can export everything as CSV, or permanently delete your account and all its data, from Settings at any time.",
  },
  {
    q: "How much does Fortune Cat cost?",
    a:
      "The core tracker is free, and Pro is a US$9 one-time payment — not a subscription. There is no renewal and no monthly fee, ever." +
      (FREE_PRO_BETA
        ? " During the beta, the $9 is waived: beta testers unlock Pro free and keep it."
        : ""),
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Free covers tracking: manual and automatic logging, one capture inbox, your daily fortune slip, CSV export, and your last 10 transactions of history. Pro adds the thinking on top — Safe-to-Spend, savings goals, a daily balance forecast for the month ahead, recurring-bill radar, the subscription kill-chain (cancel steps for the subscriptions you no longer want), deep analytics, a daily spend target on your slip, your full history, and three capture inboxes.",
  },
  {
    q: "Does Fortune Cat work in my country and currency?",
    a: "Yes — Fortune Cat works worldwide, in your own currency. You pick your country when you sign up (33 countries listed, more added on request), amounts display in your currency, and captures in a foreign currency are automatically converted into it at ECB reference rates — so an overseas trip or an online order in USD still lands in your ledger in your money.",
  },
  {
    q: "What is the daily fortune slip?",
    a: "It's a short daily reading computed from your real spending — not a horoscope. It tells you how your month is pacing, which category is running hot, and gives one concrete number to stay under today. Same data, same day, same slip: it's fully deterministic.",
  },
  {
    q: "Can I use it without forwarding SMS or emails?",
    a: "Yes — you can log every expense and income manually with categories, dates, and notes. Auto-capture is an accelerator, not a requirement.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqSection({
  /** Off on /faq: two pages emitting identical FAQPage schema is a duplicate
   *  signal, so the landing page keeps it and the help page borrows the copy. */
  jsonLd = true,
}: {
  jsonLd?: boolean;
} = {}) {
  return (
    // Anchored so /#faq lands here from anywhere.
    <section id="faq" className="scroll-mt-16 border-t border-line">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Questions, answered
          </h2>
        </Reveal>

        <Reveal delay={80} className="mt-8 space-y-2.5">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl bg-surface shadow-sm ring-1 ring-line open:pb-4"
            >
              <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-3/60 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-gold-text ring-1 ring-line transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    ＋
                  </span>
                </span>
              </summary>
              <p className="faq-answer px-5 text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </div>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
        />
      )}
    </section>
  );
}
