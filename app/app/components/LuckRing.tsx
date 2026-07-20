import FortuneCat, { type CatState } from "./FortuneCat";

/**
 * The fortune coin — the luck device. The cat is struck into a minted medallion
 * whose gold rim fills clockwise with this month's savings pace (0–100% of
 * income kept). Saving fills it in gold leaf; a month in the red leaves the coin
 * mostly unstruck with a single vermilion notch — a quiet nudge, never a scold.
 * Pure function of the numbers. (Filename kept for import stability.)
 */
export default function LuckRing({
  savingsRate,
  state,
  size = 150,
}: {
  savingsRate: number | null;
  state: CatState;
  size?: number;
}) {
  const pace = Math.max(0, Math.min(100, savingsRate ?? 0));
  const inRed = savingsRate != null && savingsRate < 0;
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pace / 100);

  // Reeded coin edge — evenly spaced ticks for a struck-metal feel.
  const ticks = Array.from({ length: 48 }, (_, i) => (i / 48) * 360);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {/* reeded rim */}
        <g stroke="var(--line)" strokeWidth="1">
          {ticks.map((deg, i) => {
            const a = (deg * Math.PI) / 180;
            const x1 = 50 + Math.cos(a) * 48.5;
            const y1 = 50 + Math.sin(a) * 48.5;
            const x2 = 50 + Math.cos(a) * 46;
            const y2 = 50 + Math.sin(a) * 46;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity={0.5} />;
          })}
        </g>

        {/* track */}
        <g transform="rotate(-90 50 50)">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
          {!inRed && pace > 0 && (
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="var(--gold)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{
                filter: "drop-shadow(0 0 4px color-mix(in oklab, var(--gold) 65%, transparent))",
                transition: "stroke-dashoffset .7s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          )}
          {inRed && (
            // a single vermilion notch at the top — one small mark, not a red ring
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="var(--vermilion)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${circ * 0.06} ${circ}`}
            />
          )}
        </g>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <FortuneCat state={state} size={Math.round(size * 0.56)} />
      </div>
    </div>
  );
}
