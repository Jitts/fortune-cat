"use client";

import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

/**
 * Wise's CountUp, applied to the one number Fortune Cat can honestly show on
 * a landing page: a sample month's Safe-to-Spend, with its arithmetic printed
 * above it so the number is a result, not a claim. Plays once when scrolled
 * into view.
 */

export const TICK_FPS = 30;
export const TICK_DURATION = 96;

const LINES = [
  { label: "Income this month", amt: 3200, sign: "" },
  { label: "Bills due before payday", amt: 1420, sign: "−" },
  { label: "Set aside for the goal", amt: 600, sign: "−" },
];
const SAFE = 3200 - 1420 - 600;
const ease = {
  easing: Easing.out(Easing.cubic),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

function money(n: number) {
  return n.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SafeToSpendTick() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "var(--l-surface-900)",
        color: "var(--l-ink)",
        fontFamily: "var(--l-font-mono)",
        fontVariantNumeric: "tabular-nums",
        padding: "28px 32px",
        display: "grid",
        alignContent: "center",
        gap: 6,
      }}
    >
      {LINES.map((l, i) => {
        const start = 6 + i * 14;
        const v = interpolate(frame, [start, start + 26], [0, l.amt], ease);
        const on = interpolate(frame, [start, start + 8], [0, 1], ease);
        return (
          <div
            key={l.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              fontSize: 17,
              opacity: on,
              color: "var(--l-ink-dim)",
              paddingBottom: 6,
              borderBottom: "1px solid var(--l-rule)",
            }}
          >
            <span style={{ fontFamily: "var(--l-font-body)" }}>{l.label}</span>
            <span>
              {l.sign}
              {money(v)}
            </span>
          </div>
        );
      })}
      {(() => {
        const start = 52;
        const v = interpolate(
          frame,
          [start, TICK_DURATION - 6],
          [0, SAFE],
          ease,
        );
        const on = interpolate(frame, [start, start + 8], [0, 1], ease);
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              paddingTop: 10,
              opacity: on,
            }}
          >
            <span
              style={{
                fontSize: 13,
                letterSpacing: "0.08em",
                color: "var(--l-ink-dim)",
              }}
            >
              SAFE TO SPEND
            </span>
            <span
              style={{
                fontFamily: "var(--l-font-display)",
                fontWeight: 800,
                fontSize: 56,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "var(--l-accent)",
              }}
            >
              {money(v)}
            </span>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
}
