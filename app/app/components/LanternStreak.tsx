/**
 * Capture streak, minted as a string of lucky coins (the square-holed cash coin
 * of prosperity). The first N coins are struck in gold for an N-day streak; the
 * remaining slots stay as faint unstruck outlines. Replaces the old lantern
 * emoji so the streak reads in the same coin language as the fortune medallion.
 */
function Coin({ struck }: { struck: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={struck ? "var(--gold)" : "transparent"}
        stroke={struck ? "var(--gold-text)" : "var(--line)"}
        strokeWidth="1.6"
        opacity={struck ? 1 : 0.7}
        style={
          struck
            ? { filter: "drop-shadow(0 0 3px color-mix(in oklab, var(--gold) 60%, transparent))" }
            : undefined
        }
      />
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        rx="1"
        fill="none"
        stroke={struck ? "var(--on-gold)" : "var(--line)"}
        strokeWidth="1.4"
        opacity={struck ? 0.85 : 0.7}
      />
    </svg>
  );
}

export default function LanternStreak({
  count,
  total = 6,
  label,
}: {
  count: number;
  total?: number;
  label?: string;
}) {
  const struck = Math.max(0, count);
  const slots = Math.max(total, struck);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1">
        {Array.from({ length: slots }).map((_, i) => (
          <Coin key={i} struck={i < struck} />
        ))}
      </div>
      {label && (
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
          {label}
        </p>
      )}
    </div>
  );
}
