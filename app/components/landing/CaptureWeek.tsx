"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * The Remotion composition behind the landing page's scroll-driven demo: a
 * sample week filling in one alert at a time. Two days never get an alert and
 * the row is printed blank rather than hidden; the last step uploads a
 * statement, which backfills the standing order but not the cash — cash never
 * reaches a bank.
 *
 * It is a DOM composition (played by @remotion/player, never rendered to a
 * file), so it inherits the page's fonts and tokens through CSS variables.
 */

export const FPS = 30;
export const STEP_FRAMES = 40;

type Row = { merchant: string; cat: string; amt: number };

export type Step = {
  day: string;
  /** The message as received; null when the bank sent nothing. */
  sms: string | null;
  sender: string;
  row: Row | null;
  /** Printed in the blank row when there is nothing to read. */
  gap?: string;
  /** Step 8: the statement fills a row printed blank earlier. */
  fills?: { day: string; row: Row };
  caption: string;
};

export const STEPS: Step[] = [
  {
    day: "Mon",
    sender: "Bank alert · 12:47",
    sms: "Your card ending 3059 was used for SGD4.20 at KOPITIAM @ TTSH on 12/07 12:47.",
    row: { merchant: "Kopitiam @ TTSH", cat: "Food & drink", amt: 4.2 },
    caption:
      "Your bank sends the alert it already sends. Fortune Cat writes the row.",
  },
  {
    day: "Tue",
    sender: "No alert",
    sms: null,
    row: null,
    gap: "cash at the hawker centre",
    caption: "No alert, no row. We print the gap instead of hiding it.",
  },
  {
    day: "Wed",
    sender: "Bank alert · 08:31",
    sms: "Your card ending 3059 was used for SGD18.40 at GRAB on 14/07 08:31.",
    row: { merchant: "Grab", cat: "Transport", amt: 18.4 },
    caption: "Amount, merchant, date. Nothing else is read.",
  },
  {
    day: "Thu",
    sender: "Bank alert · 19:04",
    sms: "Your card ending 3059 was used for SGD32.15 at UNITY BY FAIRPRICE on 15/07 19:04.",
    row: { merchant: "Unity by FairPrice", cat: "Groceries", amt: 32.15 },
    caption:
      "The category is guessed from the merchant. You can correct it once; it remembers.",
  },
  {
    day: "Fri",
    sender: "No alert",
    sms: null,
    row: null,
    gap: "standing order — this bank doesn’t alert on GIRO",
    caption:
      "Some banks don’t alert on direct debits or small amounts. Those rows stay blank too.",
  },
  {
    day: "Sat",
    sender: "Bank alert · 21:12",
    sms: "Your card ending 3059 was used for SGD27.90 at SHOPEE on 17/07 21:12.",
    row: { merchant: "Shopee", cat: "Shopping", amt: 27.9 },
    caption:
      "The first message from a new sender waits for your approval. After that, it files itself.",
  },
  {
    day: "Sun",
    sender: "Bank alert · 10:02",
    sms: "Your card ending 3059 was used for SGD20.00 at TRANSITLINK on 18/07 10:02.",
    row: { merchant: "TransitLink top-up", cat: "Transport", amt: 20 },
    caption: "Seven days, five alerts, two gaps. That is an honest week.",
  },
  {
    day: "—",
    sender: "Statement upload · read on your device",
    sms: "statement-july.pdf",
    row: null,
    fills: {
      day: "Fri",
      row: { merchant: "GIRO — insurance", cat: "Bills", amt: 120 },
    },
    caption:
      "One statement backfills what the bank never alerted on. Tuesday stays blank: cash is yours to add by hand.",
  },
];

export const DURATION = STEPS.length * STEP_FRAMES;
const DAYS = STEPS.slice(0, 7);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function money(n: number) {
  return n.toFixed(2);
}

export default function CaptureWeek() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = Math.min(STEPS.length - 1, Math.floor(frame / STEP_FRAMES));
  const local = frame - step * STEP_FRAMES;
  const current = STEPS[step];

  // The message drops in (Congrue's cg-hb-drop: -48px → 0 with a fade), then
  // the row prints a beat later with the amount flashing in the accent.
  const drop = spring({ frame: local, fps, config: { damping: 200 } });
  const bubbleY = interpolate(drop, [0, 1], [-48, 0]);
  const rowIn = interpolate(local, [14, 24], [0, 1], clamp);
  const flash = interpolate(local, [16, STEP_FRAMES], [1, 0], clamp);

  const fillDay = current.fills?.day;
  let total = 0;

  return (
    <AbsoluteFill
      style={{
        background: "var(--l-surface-900)",
        color: "var(--l-ink)",
        fontFamily: "var(--l-font-body)",
        padding: 24,
        display: "grid",
        gridTemplateRows: "132px 1fr auto",
        gap: 16,
      }}
    >
      {/* The alert as received — the phone's own face, not ours. */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: "0 auto auto 0",
            maxWidth: 432,
            opacity: drop,
            transform: `translateY(${bubbleY}px)`,
            fontFamily: current.sms
              ? "var(--l-font-received)"
              : "var(--l-font-mono)",
            background: current.sms ? "var(--l-surface-400)" : "transparent",
            border: current.sms ? "none" : "1px dashed var(--l-rule)",
            borderRadius: 18,
            borderBottomLeftRadius: 4,
            padding: "12px 16px",
            fontSize: 18,
            lineHeight: 1.35,
          }}
        >
          <div
            style={{
              fontFamily: "var(--l-font-mono)",
              fontSize: 13,
              letterSpacing: "0.04em",
              color: "var(--l-ink-dim)",
              marginBottom: 4,
            }}
          >
            {current.sender}
          </div>
          {current.sms ?? (
            <span style={{ color: "var(--l-ink-dim)" }}>{current.gap}</span>
          )}
        </div>
      </div>

      {/* The ledger — every day has a row; a row with nothing to read stays ruled and blank. */}
      <div
        style={{
          fontFamily: "var(--l-font-mono)",
          fontSize: 18,
          fontVariantNumeric: "tabular-nums",
          borderTop: "1px solid var(--l-rule)",
        }}
      >
        {DAYS.map((d, i) => {
          const isFill = d.day === fillDay;
          const printedStep = isFill ? STEPS.length - 1 : i;
          const row = isFill ? current.fills!.row : d.row;
          const done = step > printedStep;
          const now = step === printedStep;
          const shown = done ? 1 : now ? rowIn : 0;
          if (row && (done || (now && rowIn >= 1))) total += row.amt;
          const reached = step >= i;
          return (
            <div
              key={d.day}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr auto",
                gap: 12,
                alignItems: "baseline",
                height: 40,
                borderBottom: "1px solid var(--l-rule)",
                paddingInline: 4,
                background:
                  reached && !row && (!isFill || !now)
                    ? "repeating-linear-gradient(90deg, transparent 0 6px, color-mix(in oklch, var(--l-rule) 45%, transparent) 6px 7px)"
                    : "transparent",
              }}
            >
              <span style={{ color: "var(--l-ink-dim)", fontSize: 14 }}>
                {d.day}
              </span>
              {row ? (
                <>
                  <span
                    style={{
                      opacity: shown,
                      transform: `translateX(${(1 - shown) * -8}px)`,
                    }}
                  >
                    {row.merchant}
                    <span
                      style={{
                        color: "var(--l-ink-dim)",
                        fontSize: 13,
                        marginLeft: 12,
                      }}
                    >
                      {row.cat}
                    </span>
                  </span>
                  <span
                    style={{
                      opacity: shown,
                      color:
                        now && flash > 0 ? "var(--l-accent)" : "var(--l-ink)",
                    }}
                  >
                    {money(row.amt)}
                  </span>
                </>
              ) : (
                <span
                  style={{
                    gridColumn: "2 / -1",
                    color: "var(--l-ink-dim)",
                    fontFamily: "var(--l-font-body)",
                    fontSize: 14,
                    opacity: reached ? (now ? rowIn : 1) : 0,
                  }}
                >
                  {d.gap ? `— ${d.gap}` : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Running total — the number the page is about. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "var(--l-font-mono)",
        }}
      >
        <span
          style={{
            fontSize: 13,
            letterSpacing: "0.06em",
            color: "var(--l-ink-dim)",
          }}
        >
          WEEK SO FAR
        </span>
        <span
          style={{
            fontFamily: "var(--l-font-display)",
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1,
            color: "var(--l-accent)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {money(total)}
        </span>
      </div>
    </AbsoluteFill>
  );
}
