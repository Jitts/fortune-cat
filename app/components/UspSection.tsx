"use client";

import { useEffect, useState } from "react";
import Reveal from "@/app/components/Reveal";
import Daruma from "@/app/app/components/Daruma";

/**
 * "Why Fortune Cat exists" — the three reasons the product was born, each with
 * a small self-playing demo, laid out as alternating editorial rows (not a card
 * grid). Pure client state + CSS; no media files. Demos freeze on their final
 * frame under prefers-reduced-motion.
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

/* ── USP 1 · SMS becomes a ledger row (static; the hero demo is the live one) ── */

function CaptureIllustration() {
  return (
    <div className="space-y-2.5" aria-hidden>
      <div className="rounded-xl bg-surface-3 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">SMS from your bank</p>
        <p className="mt-1 font-mono text-xs leading-relaxed text-ink-muted">
          Your card was used for 12.40 at CORNER CAFE…
        </p>
      </div>
      <p className="text-center font-mono text-[10px] text-ink-faint">↓ forwarded, parsed automatically</p>
      <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-line">
        <span className="text-xl" aria-hidden>☕</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">Corner Cafe</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
            Food &amp; drink
            <span className="chip chip-jade">⚡ auto</span>
          </p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-ink">−$12.40</span>
      </div>
    </div>
  );
}

/* ── USP 2 · looping fortune-slip draw (mirrors the real DailyFortuneSlip chit) ── */

const SAMPLE_SLIPS = [
  {
    omen: "Good omen · 小吉",
    headline: "Steady hands — spending is on pace this month.",
    tip: "Keep today under $34 and the week closes ahead.",
    chop: "吉",
  },
  {
    omen: "Great omen · 大吉",
    headline: "Money in outpaces money out — the pouch grows.",
    tip: "Set aside $50 while the wind is fair.",
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
    <div className="relative min-h-[150px]" aria-hidden>
      {/* folded chit */}
      <div
        className={`slip absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          revealed ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-seal">
          drawing today&apos;s fortune…
        </span>
      </div>
      {/* revealed chit */}
      <div
        className={`slip p-4 transition-all duration-500 ${
          revealed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-seal">
              Today&apos;s fortune — {slip.omen}
            </p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-[#2a1e05]">{slip.headline}</p>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-[#0e6f52]">→ {slip.tip}</p>
          </div>
          <span className="slip-seal text-base">{slip.chop}</span>
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
    <div className="grid grid-cols-2 gap-2.5" aria-hidden>
      <div className="rounded-xl bg-surface-3 p-3.5">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">$15/mo suite</p>
        <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-vermilion">${months * 15}</p>
        <p className="text-xs text-ink-subtle">
          {months === 0 ? "and counting…" : `after ${years >= 1 ? `${years} yr${years > 1 ? "s" : ""}` : `${months} mo`} — still counting`}
        </p>
      </div>
      <div className="rounded-xl p-3.5 ring-1 ring-jade/40">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Fortune Cat Pro</p>
        <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-jade">$9</p>
        <p className="text-xs text-ink-subtle">once. done. ✓</p>
      </div>
    </div>
  );
}

/* ── USP 4 · a Fortune Goal fills as you save, mirrors the real goal row ── */

const GOAL_STEPS = 34;

function GoalsDemo() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? GOAL_STEPS : 0);

  useEffect(() => {
    if (reduced) {
      setStep(GOAL_STEPS);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    function tick(s: number) {
      if (cancelled) return;
      setStep(s);
      timer = setTimeout(() => tick(s >= GOAL_STEPS ? 0 : s + 1), s >= GOAL_STEPS ? 1800 : 90);
    }
    timer = setTimeout(() => tick(0), 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reduced]);

  const pct = step / GOAL_STEPS;
  const saved = Math.round(pct * 10000);

  return (
    <div className="rounded-xl p-4 ring-1 ring-line" aria-hidden>
      <div className="flex items-start gap-3">
        <Daruma progress={pct} size={40} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Emergency fund</p>
              <p className="mt-0.5 text-xs tabular-nums text-ink-subtle">${saved.toLocaleString()} of $10,000</p>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-gold-text">
              {Math.round(pct * 100)}%
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(3, pct * 100)}%`,
                background: "linear-gradient(90deg, var(--leaf-hi), var(--gold) 60%, var(--vermilion))",
                transition: "width 90ms linear",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── the section ── */

type Usp = { kicker: string; title: string; badge?: string; story: string; demo: React.ReactNode };

const USPS: Usp[] = [
  {
    kicker: "capture",
    title: "Your money logs itself",
    story:
      "Trackers die because typing every coffee is a chore. Fortune Cat reads the SMS and emails your bank already sends — no bank login, and it only ever sees the message text you forward.",
    demo: <CaptureIllustration />,
  },
  {
    kicker: "ritual",
    title: "A ritual, not a spreadsheet",
    story:
      "Money apps get abandoned because they feel like homework. The daily fortune slip reads your real cash flow and hands you one concrete number for the day.",
    demo: <SlipDemo />,
  },
  {
    kicker: "goals",
    title: "Make a wish. Paint it true.",
    badge: "Pro",
    story:
      "Set a Fortune Goal — a holiday, an emergency fund — and the daruma watches over it. One eye for the wish, the second painted in the day you reach it.",
    demo: <GoalsDemo />,
  },
  {
    kicker: "price",
    title: "US$9 once, yours forever",
    story:
      "A money-saving app that bills you monthly is a leak, not a fix. One payment unlocks every engine — no subscription, no renewal.",
    demo: <PriceDemo />,
  },
];

export default function UspSection() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Every expense tracker asks you to do the work.
            <span className="text-ink-subtle"> This one was born to do it for you.</span>
          </h2>
        </Reveal>

        <div className="mt-14 space-y-16 sm:space-y-20">
          {USPS.map((u, i) => (
            <Reveal key={u.title}>
              <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-gold-text">
                    {u.kicker}
                  </p>
                  <h3 className="mt-3 flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-ink">
                    {u.title}
                    {u.badge && <span className="chip chip-gold">{u.badge}</span>}
                  </h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">{u.story}</p>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : ""}>{u.demo}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
