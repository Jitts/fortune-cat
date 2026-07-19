"use client";

import { useEffect, useState } from "react";
import Reveal from "@/app/components/Reveal";

/**
 * "Why Fortune Cat exists" — the three reasons the product was born, each with
 * a small self-playing demo. Pure client state + CSS; no media files. Demos
 * freeze on their final frame under prefers-reduced-motion.
 */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ── USP 1 · static illustration: SMS becomes a ledger row (the hero demo above is the live version) ── */

function CaptureIllustration() {
  return (
    <div className="mt-4 space-y-2" aria-hidden>
      <div className="rounded-xl bg-surface-3 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">SMS from your bank</p>
        <p className="mt-1 text-xs text-ink-muted">Your card was used for 12.40 at CORNER CAFE…</p>
      </div>
      <p className="text-center text-xs text-ink-faint">↓ forwarded, parsed automatically</p>
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-line">
        <span className="text-xl">☕</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">Corner Cafe</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            Food &amp; drink
            <span className="rounded-full bg-emerald-50 px-1.5 py-px font-mono text-[10px] text-emerald-700">
              ⚡ auto
            </span>
          </p>
        </div>
        <span className="text-sm font-semibold text-ink">−$12.40</span>
      </div>
    </div>
  );
}

/* ── USP 2 · looping fortune-slip draw (styling mirrors the real DailyFortuneSlip chit) ── */

const SAMPLE_SLIPS = [
  {
    omen: "Good omen · 小吉",
    headline: "Steady hands — spending is on pace this month.",
    tip: "→ Keep today under $34 and the week closes ahead.",
    chop: "吉",
  },
  {
    omen: "Great omen · 大吉",
    headline: "Money in outpaces money out — the pouch grows.",
    tip: "→ Set aside $50 while the wind is fair.",
    chop: "吉",
  },
] as const;

function SlipDemo() {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [which, setWhich] = useState(0);

  useEffect(() => {
    if (reduced) {
      setRevealed(true);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    function cycle(show: boolean) {
      if (cancelled) return;
      setRevealed(show);
      if (!show) setWhich((w) => (w + 1) % SAMPLE_SLIPS.length);
      timer = setTimeout(() => cycle(!show), show ? 3600 : 1100);
    }
    timer = setTimeout(() => cycle(true), 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reduced]);

  const slip = SAMPLE_SLIPS[which];

  return (
    <div className="relative mt-4 min-h-[148px]" aria-hidden>
      {/* folded chit */}
      <div
        className={`absolute inset-0 flex items-center justify-center rounded-2xl border border-dashed border-red-300 bg-paper transition-opacity duration-500 ${
          revealed ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
          🎴 drawing today&apos;s fortune…
        </span>
      </div>
      {/* revealed chit */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-dashed border-red-300 bg-paper p-4 transition-all duration-500 ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-red-400" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-red-700">
              Today&apos;s fortune — {slip.omen}
            </p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-neutral-800">{slip.headline}</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-emerald-700">{slip.tip}</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 rotate-6 items-center justify-center rounded-md bg-red-600 text-base font-bold text-white shadow-sm">
            {slip.chop}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── USP 3 · the subscription meter ticks up while $9 sits still ── */

const FINAL_MONTHS = 36;

function PriceDemo() {
  const reduced = useReducedMotion();
  const [months, setMonths] = useState(reduced ? FINAL_MONTHS : 0);

  useEffect(() => {
    if (reduced) {
      setMonths(FINAL_MONTHS);
      return;
    }
    const timer = setInterval(() => {
      setMonths((m) => (m >= FINAL_MONTHS ? 0 : m + 1));
    }, 220);
    return () => clearInterval(timer);
  }, [reduced]);

  const years = Math.floor(months / 12);

  return (
    <div className="mt-4 grid grid-cols-2 gap-2" aria-hidden>
      <div className="rounded-xl bg-surface-3 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">$15/mo budgeting suite</p>
        <p className="mt-1 text-2xl font-bold text-red-600 [font-variant-numeric:tabular-nums]">
          ${months * 15}
        </p>
        <p className="text-xs text-ink-faint">
          {months === 0 ? "and counting…" : `after ${years >= 1 ? `${years} yr${years > 1 ? "s" : ""}` : `${months} mo`} — still counting`}
        </p>
      </div>
      <div className="rounded-xl p-3 ring-1 ring-emerald-200">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Fortune Cat Pro</p>
        <p className="mt-1 text-2xl font-bold text-emerald-700">$9</p>
        <p className="text-xs text-ink-faint">once. done. ✓</p>
      </div>
    </div>
  );
}

/* ── the section ── */

const USPS = [
  {
    title: "Your money logs itself",
    story:
      "Trackers die because typing every coffee is a chore. Fortune Cat reads the SMS and emails your bank already sends — no bank login, and it only ever sees the message text you forward.",
    demo: <CaptureIllustration />,
  },
  {
    title: "A ritual, not a spreadsheet",
    story:
      "Money apps get abandoned because they feel like homework. The daily fortune slip reads your real cash flow and hands you one concrete number for the day.",
    demo: <SlipDemo />,
  },
  {
    title: "US$9 once, yours forever",
    story:
      "A money-saving app that bills you monthly is a leak, not a fix. One payment unlocks every engine — no subscription, no renewal.",
    demo: <PriceDemo />,
  },
];

export default function UspSection() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-red-700 dark:text-red-400">
            the origin story
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Why Fortune Cat exists
          </h2>
          <p className="mt-2 text-ink-muted">
            Every expense tracker asks you to do the work. This one was born to do it for you.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {USPS.map((u, i) => (
            <Reveal key={u.title} delay={i * 80}>
              <div className="card-lift h-full rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
                <h3 className="text-base font-semibold text-ink">{u.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{u.story}</p>
                {u.demo}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
