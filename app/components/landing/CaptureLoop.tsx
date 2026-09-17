"use client";

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * The hero's ambient loop — where Wise puts its globe. Four bank alerts, one
 * after another: each drops in as the phone shows it, becomes a ledger row,
 * and joins the rows already written. It loops seamlessly and says nothing
 * the widget below doesn't say; it is the product, moving.
 *
 * DOM composition (played, never rendered) — fonts and colours come from the
 * page's --l-* tokens.
 */

export const LOOP_FPS = 30;
const BEAT = 84; // frames per alert
const ALERTS = [
  {
    sender: "Bank alert · 12:47",
    sms: "Your card ending 3059 was used for SGD4.20 at KOPITIAM @ TTSH on 12/07 12:47.",
    merchant: "Kopitiam @ TTSH",
    cat: "Food & drink",
    amt: "4.20",
  },
  {
    sender: "Bank alert · 08:31",
    sms: "Your card ending 3059 was used for SGD18.40 at GRAB on 14/07 08:31.",
    merchant: "Grab",
    cat: "Transport",
    amt: "18.40",
  },
  {
    sender: "Bank alert · 19:04",
    sms: "Your card ending 3059 was used for SGD32.15 at UNITY BY FAIRPRICE on 15/07 19:04.",
    merchant: "Unity by FairPrice",
    cat: "Groceries",
    amt: "32.15",
  },
  {
    sender: "Bank alert · 21:12",
    sms: "Your card ending 3059 was used for SGD27.90 at SHOPEE on 17/07 21:12.",
    merchant: "Shopee",
    cat: "Shopping",
    amt: "27.90",
  },
];
export const LOOP_DURATION = ALERTS.length * BEAT;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ROW_H = 44;

export default function CaptureLoop({ narrow = false }: { narrow?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = Math.floor(frame / BEAT) % ALERTS.length;
  const local = frame % BEAT;
  const a = ALERTS[i];

  const drop = spring({ frame: local, fps, config: { damping: 200 } });
  const bubbleY = interpolate(drop, [0, 1], [-40, 0]);
  const bubbleOut = interpolate(local, [BEAT - 14, BEAT - 4], [1, 0], clamp);
  const rowIn = interpolate(local, [22, 34], [0, 1], clamp);
  const flash = interpolate(local, [24, 70], [1, 0], clamp);

  // The three rows written before this one, oldest at the bottom. The newest
  // slides in from the alert's side; the stack shifts down to make room.
  const prev = [1, 2, 3].map(
    (k) => ALERTS[(i - k + ALERTS.length) % ALERTS.length],
  );
  const shift = interpolate(local, [22, 34], [0, ROW_H], clamp);

  return (
    <AbsoluteFill
      style={{
        background: "var(--l-surface-900)",
        color: "var(--l-ink)",
        fontFamily: "var(--l-font-body)",
        padding: narrow ? "24px 24px" : "28px 32px",
        display: "grid",
        gridTemplateColumns: narrow
          ? "minmax(0, 1fr)"
          : "minmax(0, 1fr) minmax(0, 1fr)",
        gap: narrow ? 20 : 32,
        alignItems: "center",
        textAlign: "left",
      }}
    >
      <div style={{ position: "relative", height: narrow ? 128 : 150 }}>
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            opacity: drop * bubbleOut,
            transform: `translateY(${bubbleY}px)`,
            fontFamily: "var(--l-font-received)",
            background: "var(--l-surface-400)",
            borderRadius: 20,
            borderBottomLeftRadius: 4,
            padding: "12px 16px",
            fontSize: 18,
            lineHeight: 1.35,
          }}
        >
          <div
            style={{
              fontFamily: "var(--l-font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: "var(--l-ink-dim)",
              marginBottom: 4,
            }}
          >
            {a.sender}
          </div>
          {a.sms}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          height: ROW_H * 3,
          overflow: "hidden",
          fontFamily: "var(--l-font-mono)",
          fontSize: 17,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            transform: `translateY(${shift - ROW_H}px)`,
          }}
        >
          {[a, ...prev].map((r, k) => {
            const isNew = k === 0;
            const shown = isNew ? rowIn : 1;
            const fade = k === 3 ? 1 - rowIn : 1;
            return (
              <div
                key={r.merchant + k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: 12,
                  alignItems: "baseline",
                  height: ROW_H,
                  borderBottom: "1px solid var(--l-rule)",
                  opacity: shown * fade,
                  transform: isNew
                    ? `translateX(${(1 - shown) * -12}px)`
                    : undefined,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.merchant}
                  <span
                    style={{
                      color: "var(--l-ink-dim)",
                      fontSize: 12,
                      marginLeft: 10,
                    }}
                  >
                    {r.cat}
                  </span>
                </span>
                <span
                  style={{
                    color:
                      isNew && flash > 0 ? "var(--l-accent)" : "var(--l-ink)",
                  }}
                >
                  {r.amt}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
