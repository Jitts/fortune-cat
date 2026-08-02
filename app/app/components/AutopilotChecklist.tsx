"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const HIDE_KEY = "fc-autopilot-hidden";

type Step = {
  done: boolean;
  /** Consequence-first — what the user GETS, not the feature's name. */
  title: string;
  hint: string;
  /** Two or three words, for the "then:" trail of what's still coming. */
  short: string;
  cta: string;
  /** Exactly one of these. `action` keeps the user on the dashboard. */
  href?: string;
  action?: () => void;
};

/**
 * First-run guide: ONE thing to do, then the next, until the ledger runs
 * itself. Beta testers failed the previous three-row version in three
 * distinct ways, and the shape of this component is the answer to each:
 *
 *  - "I thought the bullet buttons were options for me to choose from."
 *    Three peer rows with unfilled circles read as a radio group, because
 *    that is what a circle at the leading edge of sibling rows means
 *    everywhere. Showing one step at a time removes the choice being
 *    misread, and the marker is now a mono ordinal — sequence, not select.
 *
 *  - "I couldn't finish reading the text." The hints were `truncate`d to
 *    roughly 38 characters on a phone, which amputated the reassuring half
 *    of the sentence ("undo is always one tap") on the very step people are
 *    most nervous about. One step means one hint with room to wrap.
 *
 *  - "I thought it had taken me to the wrong page, so I went back and
 *    clicked it again." All three rows pointed at /settings on first run.
 *    Now there is one destination at a time, step one doesn't navigate at
 *    all, and the rest deep-link to the named section that completes them.
 *
 * The first step is deliberately the cheapest thing in the product: log
 * something by hand. The ＋ button is the biggest, goldest, most reachable
 * control on the screen, and it used to score zero here — the app pointed at
 * Settings while its own primary action counted for nothing. Asking someone
 * to hand over an email app password before they have seen the product do
 * anything is the highest-friction request we have, at the moment of lowest
 * trust; one number on screen buys the credibility to ask.
 */
export default function AutopilotChecklist({
  logged,
  captured,
  trusted,
  backfilled,
  onLogFirst,
}: {
  logged: boolean;
  captured: boolean;
  trusted: boolean;
  backfilled: boolean;
  /** Opens the entry sheet (mobile) or the add modal (desktop), in place. */
  onLogFirst: () => void;
}) {
  // Start expanded so server/client match on first paint; reconcile with the
  // stored pick right after mount (same pattern as ThemeToggle).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem(HIDE_KEY) === "1");
  }, []);

  const steps: Step[] = [
    {
      done: logged,
      title: "Put one thing in the ledger",
      hint: "Ten seconds by hand. Everything else here builds on having something to look at — and the ＋ button does this any time.",
      short: "log one thing",
      cta: "Log something",
      action: onLogFirst,
    },
    {
      done: captured,
      title: "Let your bank's messages log themselves",
      hint: "Connect an inbox, or forward one bank SMS from your phone. Nothing posts behind your back — the first message from a new sender waits for you in review.",
      short: "turn on capture",
      cta: "Set up capture",
      href: "/settings?task=email",
    },
    {
      done: trusted,
      title: "Trust that sender, so the next one is automatic",
      hint: "One tap in review, and messages from that sender post on their own from then on. You can undo it whenever you like.",
      short: "trust a sender",
      cta: "Open review",
      href: "/review",
    },
    {
      done: backfilled,
      title: "See where last month went",
      hint: "Upload one statement and the history fills in behind you. A PDF works, and so does a photo of one.",
      short: "backfill last month",
      cta: "Upload a statement",
      href: "/settings?task=statements",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const currentIndex = steps.findIndex((s) => !s.done);
  const current = steps[currentIndex];
  const upcoming = steps.filter((s, i) => i !== currentIndex && !s.done);

  if (collapsed) {
    return (
      <button
        onClick={() => {
          localStorage.removeItem(HIDE_KEY);
          setCollapsed(false);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-soft px-5 py-3 text-left hover:bg-gold-soft/70"
      >
        <span className="min-w-0 text-sm font-semibold text-ink">
          Get to autopilot{" "}
          <span className="font-mono text-xs font-normal text-ink-muted">
            {doneCount} of {steps.length}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-gold-text">Show</span>
      </button>
    );
  }

  return (
    <section
      aria-label="Set-up guide"
      className="rounded-2xl border border-gold/40 bg-gold-soft p-5 shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Get to autopilot{" "}
          <span className="font-mono text-xs font-normal text-ink-muted">
            {doneCount} of {steps.length}
          </span>
        </h2>
        {/* Negative margin + padding: a real 44px target without moving the
            label off the baseline it shares with the heading. The control this
            replaces was 27x16px, in the hardest corner of the screen to reach
            one-handed. */}
        <button
          onClick={() => {
            localStorage.setItem(HIDE_KEY, "1");
            setCollapsed(true);
          }}
          className="-m-3.5 shrink-0 p-3.5 text-xs font-medium text-ink-muted hover:text-ink"
        >
          Later
        </button>
      </div>

      {/* One pip per step, so zero progress LOOKS like zero. The bar this
          replaces rendered Math.max(8, …), showing a gold sliver next to the
          words "0 of 3" — two status displays contradicting each other. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={doneCount}
        aria-label={`${doneCount} of ${steps.length} set-up steps done`}
        className="mt-3 flex gap-1.5"
      >
        {/* Only completed steps get gold. Tinting the CURRENT step too was the
            old bug in new clothes — at "0 of 4" it put a gold pip on screen
            next to the words "0 of 4". Which step you're on is carried by the
            ordinal badge below, so the pips can stay purely a count. */}
        {steps.map((s) => (
          <span
            key={s.title}
            className={`h-1.5 flex-1 rounded-full ${s.done ? "bg-gold" : "bg-ink/15"}`}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold font-mono text-[11px] font-bold text-on-gold"
        >
          {currentIndex + 1}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{current.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{current.hint}</p>
        </div>
      </div>

      <div className="mt-3.5 sm:pl-9">
        {current.href ? (
          <Link href={current.href} className="btn btn-gold min-h-11 w-full px-5 text-sm sm:w-auto">
            {current.cta}
          </Link>
        ) : (
          <button
            onClick={current.action}
            className="btn btn-gold min-h-11 w-full px-5 text-sm sm:w-auto"
          >
            {current.cta}
          </button>
        )}
      </div>

      <p className="mt-4 border-t border-gold/25 pt-3 text-xs text-ink-muted">
        {upcoming.length > 0
          ? `Then: ${upcoming.map((s) => s.short).join(" · ")}`
          : "Last one — then this card retires and the ledger runs itself."}
      </p>
    </section>
  );
}
