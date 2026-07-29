"use client";

/**
 * The shared 4-column money keypad: digits, +/−, backspace, and one primary
 * action in the tall right-hand slot. Used by the quick-add sheet and by the
 * edit form's amount field, so entering money feels the same in both places.
 *
 * Keys are 60px tall — comfortably past the 44px touch minimum, because this
 * is used one-handed while standing up.
 */

const KEY =
  "flex items-center justify-center rounded-xl py-4 text-xl font-semibold tabular-nums transition-colors active:scale-[.97]";

export default function Keypad({
  onPush,
  onBackspace,
  primaryLabel,
  onPrimary,
  primaryDisabled,
}: {
  onPush: (ch: string) => void;
  onBackspace: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {["1", "2", "3"].map((d) => (
        <button key={d} type="button" onClick={() => onPush(d)} className={`${KEY} bg-surface-3 text-ink`}>
          {d}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPush("+")}
        aria-label="Plus"
        className={`${KEY} bg-gold-soft text-gold-text`}
      >
        +
      </button>

      {["4", "5", "6"].map((d) => (
        <button key={d} type="button" onClick={() => onPush(d)} className={`${KEY} bg-surface-3 text-ink`}>
          {d}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPush("-")}
        aria-label="Minus"
        className={`${KEY} bg-gold-soft text-gold-text`}
      >
        −
      </button>

      {["7", "8", "9"].map((d) => (
        <button key={d} type="button" onClick={() => onPush(d)} className={`${KEY} bg-surface-3 text-ink`}>
          {d}
        </button>
      ))}
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        className={`${KEY} row-span-2 bg-gold text-on-gold disabled:opacity-40`}
      >
        {primaryLabel}
      </button>

      <button type="button" onClick={() => onPush(".")} className={`${KEY} bg-surface-3 text-ink`}>
        .
      </button>
      <button type="button" onClick={() => onPush("0")} className={`${KEY} bg-surface-3 text-ink`}>
        0
      </button>
      <button
        type="button"
        onClick={onBackspace}
        aria-label="Delete last entry"
        className={`${KEY} bg-surface-3 text-ink-muted`}
      >
        ⌫
      </button>
    </div>
  );
}
