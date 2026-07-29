"use client";

import { useEffect, useState } from "react";
import { useMoney } from "@/app/components/CurrencyProvider";
import { displayExpression, evaluateExpression, pushKey } from "@/lib/calc";
import Keypad from "./Keypad";

/**
 * The amount keypad, opened by tapping the Amount field in the add/edit form on
 * a phone. Same calculator as quick-add, so "4.20 + 4.30" works when correcting
 * a captured row too — the case it matters most, since a wrong amount is
 * usually being fixed against a receipt with several lines on it.
 *
 * Seeded with whatever the field already holds, so opening it to tweak an
 * existing figure never starts from zero.
 */
export default function AmountKeypadSheet({
  initial,
  onDone,
  onClose,
}: {
  /** Current field value, e.g. "6" or "12.40". Non-numeric is treated as empty. */
  initial: string;
  onDone: (amount: string) => void;
  onClose: () => void;
}) {
  const { format } = useMoney();
  const [expr, setExpr] = useState(() => (initial && !Number.isNaN(Number(initial)) ? initial : ""));

  const amount = evaluateExpression(expr);
  const working = displayExpression(expr);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Amount keypad"
    >
      <button
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
        onClick={onClose}
        aria-label="Close keypad"
        tabIndex={-1}
      />

      <div className="quick-sheet relative rounded-t-3xl border-t border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.6)]">
        <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />

        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">Amount</p>
          <p className="font-display text-4xl font-extrabold tabular-nums text-ink">{format(amount)}</p>
          <p className="mt-1 h-4 font-mono text-[11px] text-ink-faint">{working}</p>
        </div>

        <div className="mt-3">
          <Keypad
            onPush={(ch) => setExpr((p) => pushKey(p, ch))}
            onBackspace={() => setExpr((p) => p.slice(0, -1))}
            primaryLabel="Done ✓"
            onPrimary={() => onDone(amount > 0 ? String(amount) : "")}
          />
        </div>
      </div>
    </div>
  );
}
