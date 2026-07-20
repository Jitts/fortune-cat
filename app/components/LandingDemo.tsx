"use client";

import { useEffect, useState } from "react";

/**
 * The landing demo runs the real capture loop on fake data: forward an SMS,
 * it lands in review; trust the sender, the next one posts itself. Pure
 * client state — nothing is sent anywhere.
 */
export default function LandingDemo() {
  // 0 = SMS waiting · 1 = in review · 2 = trusted, second SMS incoming ·
  // 3 = second SMS auto-posted
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage !== 2) return;
    const timer = setTimeout(() => setStage(3), 1100);
    return () => clearTimeout(timer);
  }, [stage]);

  const balance = 2903.56 - (stage >= 1 ? 5.96 : 0) - (stage >= 3 ? 4.2 : 0);

  return (
    <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.5)] ring-1 ring-line">
      {/* device chrome */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Fortune Cat · live ledger
        </span>
        {stage > 0 && (
          <button
            onClick={() => setStage(0)}
            className="pressable rounded-md px-1.5 py-0.5 text-xs text-ink-faint hover:text-ink-muted"
          >
            ↺ replay
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium text-ink-faint">Balance</p>
          <p className="font-display text-4xl font-extrabold tabular-nums text-ink">
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {/* Incoming SMS bubble */}
        <div className="rounded-xl bg-surface-3 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
            {stage < 2 ? "SMS · from DBS" : "Next SMS · from DBS"}
          </p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-ink-muted">
            {stage < 2
              ? "Your card ending 3059 was used for SGD5.96 at UNITY BY FAIRPRICE on 12/07 09:12."
              : "Your card ending 3059 was used for SGD4.20 at KOPITIAM @ TTSH on 12/07 12:47."}
          </p>
          {stage === 0 && (
            <button
              onClick={() => setStage(1)}
              className="btn btn-ink pressable mt-2.5 px-3 py-1.5 text-xs"
            >
              Forward to Fortune Cat →
            </button>
          )}
          {stage === 2 && (
            <p className="mt-2 font-mono text-[10px] text-ink-faint">arriving…</p>
          )}
        </div>

        {/* Captured rows */}
        {stage >= 1 && (
          <div className="print-in rounded-xl ring-1 ring-line">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xl" aria-hidden>🛒</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">Unity by FairPrice</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                  Groceries
                  <span className="chip chip-mute">💬 sms</span>
                  {stage === 1 && <span className="chip chip-gold">in review</span>}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-ink">−$5.96</span>
            </div>
            {stage === 1 && (
              <div className="border-t border-line px-3 py-2">
                <button
                  onClick={() => setStage(2)}
                  className="btn pressable px-3 py-1.5 text-xs"
                  style={{ background: "var(--jade)", color: "var(--surface)" }}
                >
                  Accept &amp; trust DBS
                </button>
              </div>
            )}
          </div>
        )}

        {stage >= 3 && (
          <div className="print-in flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-jade/40">
            <span className="text-xl" aria-hidden>☕</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">Kopitiam @ TTSH</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                Food &amp; drink
                <span className="chip chip-jade">⚡ auto</span>
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-ink">−$4.20</span>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-subtle">
        {stage === 0 && "Try it — this demo runs entirely in your browser."}
        {stage === 1 && "Captured. First time from this sender, so it waits for you."}
        {stage === 2 && "DBS is trusted now — watch the next one."}
        {stage === 3 && "That's the autopilot. No typing, no bank login."}
      </p>
    </div>
  );
}
