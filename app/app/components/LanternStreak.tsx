/**
 * Lantern streak (Direction B): a row of paper-lantern beads, the first N lit
 * gold for an N-day streak, the rest hanging dim. Used for the capture streak
 * and the fortune-draw streak. SVG (not the 🏮 emoji) so lit vs. dim is real.
 */

function Lantern({ lit }: { lit: boolean }) {
  const cap = lit ? "fill-fortune-700" : "fill-line";
  return (
    <svg width="13" height="19" viewBox="0 0 13 19" aria-hidden className="shrink-0">
      {/* hanger */}
      <line x1="6.5" y1="0.5" x2="6.5" y2="2.5" className="stroke-ink-faint" strokeWidth="1" />
      {/* top cap */}
      <rect x="3.5" y="2.5" width="6" height="1.6" rx="0.8" className={cap} />
      {/* body */}
      <ellipse
        cx="6.5"
        cy="9.5"
        rx="5"
        ry="5.2"
        strokeWidth="0.8"
        className={lit ? "fill-fortune-400 stroke-fortune-700" : "fill-surface-3 stroke-line"}
        style={lit ? { filter: "drop-shadow(0 0 3px rgba(255,215,0,.7))" } : undefined}
      />
      {/* bottom cap + tassel */}
      <rect x="4.5" y="14.4" width="4" height="1.4" rx="0.7" className={cap} />
      <line x1="6.5" y1="15.8" x2="6.5" y2="18.5" strokeWidth="1" className={lit ? "stroke-fortune-700" : "stroke-line"} />
    </svg>
  );
}

export default function LanternStreak({
  count,
  total = 7,
  label,
}: {
  count: number;
  total?: number;
  label?: string;
}) {
  const lit = Math.max(0, count);
  const slots = Math.max(total, lit);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-1">
        {Array.from({ length: slots }).map((_, i) => (
          <Lantern key={i} lit={i < lit} />
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
