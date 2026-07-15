import { type CatState } from "./FortuneCat";

// The cat face, mockup-style: an emoji whose mood tracks catState so the ring
// and the cat still read together. 🙀 for the alarmed "ears back" state (matches
// the mockup), happier cats when the month is saving or steady.
const CAT_EMOJI: Record<CatState, string> = {
  saving: "😸",
  even: "😺",
  burning: "🙀",
};

/**
 * The luck ring (Direction B): a thick jade progress arc around the fortune cat
 * whose fill is this month's savings pace (0–100% of income kept). Jade when
 * saving, red when the month is in the red. Pure function of the numbers.
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
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pace / 100);
  const inRed = savingsRate != null && savingsRate < 0;
  const arc = inRed ? "#dc2626" : "#10b981"; // red attention / jade money-in

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        {/* track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-line" />
        {/* pace arc */}
        {pace > 0 && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={arc}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 5px ${inRed ? "rgba(220,38,38,.45)" : "rgba(16,185,129,.55)"})`,
              transition: "stroke-dashoffset .6s ease",
            }}
          />
        )}
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center leading-none"
        style={{ fontSize: Math.round(size * 0.42) }}
        role="img"
        aria-label={`Fortune cat — ${state}`}
      >
        {CAT_EMOJI[state]}
      </div>
    </div>
  );
}
