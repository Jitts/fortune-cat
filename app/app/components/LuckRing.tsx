import FortuneCat, { type CatState } from "./FortuneCat";

/**
 * The luck ring (Direction B): a jade progress arc around the fortune cat whose
 * fill is this month's savings pace (0–100% of income kept). Jade when saving,
 * red when the month is in the red. The cat's mood still comes from catState, so
 * ring and cat read together. Pure function of the numbers — no animation state.
 */
export default function LuckRing({
  savingsRate,
  state,
  size = 132,
}: {
  savingsRate: number | null;
  state: CatState;
  size?: number;
}) {
  const pace = Math.max(0, Math.min(100, savingsRate ?? 0));
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pace / 100);
  const inRed = savingsRate != null && savingsRate < 0;
  const arc = inRed ? "#dc2626" : "#10b981"; // red attention / jade money-in

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        {/* track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-line" />
        {/* pace arc */}
        {pace > 0 && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={arc}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 4px ${inRed ? "rgba(220,38,38,.45)" : "rgba(16,185,129,.55)"})`,
              transition: "stroke-dashoffset .6s ease",
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <FortuneCat state={state} size={Math.round(size * 0.6)} />
      </div>
    </div>
  );
}
