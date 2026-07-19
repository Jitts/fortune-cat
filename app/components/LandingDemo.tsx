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
    <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium text-ink-faint">Balance</p>
          <p className="text-3xl font-bold text-ink [font-variant-numeric:tabular-nums]">
            ${balance.toLocaleString("en-SG", { minimumFractionDigits: 2 })}
          </p>
        </div>
        {stage > 0 && (
          <button
            onClick={() => setStage(0)}
            className="text-xs text-ink-faint hover:text-ink-muted"
          >
            ↺ replay
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {/* Incoming SMS bubble */}
        <div className="rounded-xl bg-surface-3 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
            {stage < 2 ? "SMS from DBS" : "Next SMS from DBS"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {stage < 2
              ? "Your card ending 3059 was used for SGD5.96 at UNITY BY FAIRPRICE on 12/07 09:12."
              : "Your card ending 3059 was used for SGD4.20 at KOPITIAM @ TTSH on 12/07 12:47."}
          </p>
          {stage === 0 && (
            <button
              onClick={() => setStage(1)}
              className="pressable mt-2 rounded-lg bg-action px-3 py-1.5 text-xs font-semibold text-white hover:bg-action/90"
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
          <div className="rounded-xl ring-1 ring-line transition-[opacity,transform] duration-500 starting:translate-y-2 starting:opacity-0">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-xl">🛒</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  Unity by FairPrice
                </p>
                <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                  Groceries
                  <span className="rounded-full bg-surface-3 px-1.5 py-px font-mono text-[10px] text-ink-subtle">
                    💬 sms
                  </span>
                  {stage === 1 && (
                    <span className="rounded-full bg-amber-50 px-1.5 py-px font-mono text-[10px] text-amber-700">
                      in review
                    </span>
                  )}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink">−$5.96</span>
            </div>
            {stage === 1 && (
              <div className="border-t border-line px-3 py-2">
                <button
                  onClick={() => setStage(2)}
                  className="pressable rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Accept &amp; trust DBS
                </button>
              </div>
            )}
          </div>
        )}

        {stage >= 3 && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-emerald-200 transition-[opacity,transform] duration-500 starting:translate-y-2 starting:opacity-0">
            <span className="text-xl">☕</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">Kopitiam @ TTSH</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                Food &amp; drink
                <span className="rounded-full bg-emerald-50 px-1.5 py-px font-mono text-[10px] text-emerald-700">
                  ⚡ auto
                </span>
              </p>
            </div>
            <span className="text-sm font-semibold text-ink">−$4.20</span>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-ink-faint">
        {stage === 0 && "Try it — this demo runs entirely in your browser."}
        {stage === 1 && "Captured. First time from this sender, so it waits for you."}
        {stage === 2 && "DBS is trusted now — watch the next one."}
        {stage === 3 && "That's the autopilot. No typing, no bank login."}
      </p>
    </div>
  );
}
