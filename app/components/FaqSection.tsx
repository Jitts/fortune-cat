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
    a: "You forward the transaction SMS or emails your bank already sends you, and Fortune Cat parses them into ledger entries — it never asks for a bank login and only sees the message text you forward. The first message from a new sender waits in a review queue for your approval; once you trust the sender, later transactions post themselves.",
  },
  {
    q: "Do I need to connect my bank account?",
    a: "No — Fortune Cat never asks for a bank login, and there is no account linking or screen-scraping. It only ever sees the notification text you choose to forward.",
  },
  {
    q: "Is my financial data safe?",
    a: "Fortune Cat is built so there's little to steal: it holds no bank credentials, and every user's data is isolated with database row-level security. You can export your transactions as CSV or permanently delete your account and all its data from Settings at any time.",
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
    a: "Free includes manual and automatic logging, one capture inbox, and your last 10 transactions of history. Pro unlocks everything: Safe-to-Spend, savings goals, recurring-bill radar, the subscription kill-chain (cancel steps for the subscriptions you no longer want), deep analytics, actionable daily readings, full history, and three capture inboxes.",
  },
  {
    q: "Does Fortune Cat work in my country and currency?",
    a: "Yes — Fortune Cat works worldwide, in your own currency. You pick your country when you sign up (33 countries listed, more added on request), amounts display in your currency, and captures in a foreign currency are converted into it at ECB reference rates.",
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

export default function FaqSection() {
  return (
    <section className="border-t border-line">
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
    </section>
  );
}
