/**
 * The fortune cat — a minted maneki-neko whose expression is a pure function of
 * this month's cash flow. No AI, no randomness: saving = content (eyes closed,
 * calm), even = watchful, burning = alert. Gold leaf on a lacquer outline; the
 * one mark used everywhere from the 22px wordmark to the dashboard hero, so it
 * stays crisp at any size. Red is never used here — attention lives elsewhere.
 */

export type CatState = "saving" | "even" | "burning";

export function catState(net: number, burnDelta: number | null): CatState {
  if (net < 0 || (burnDelta != null && burnDelta > 30)) return "burning";
  if (net > 0) return "saving";
  return "even";
}

// Fixed leaf tones — read cleanly on both rice-paper light and lacquer dark.
const GOLD = "#e8bd54";
const GOLD_HI = "#f4d888";
const LINE = "#6f4e0d";
const CREAM = "#fbf3dd";
const BELL = "#cf9528";

export default function FortuneCat({
  state,
  size = 76,
  className,
}: {
  state: CatState;
  size?: number;
  className?: string;
}) {
  const alarmed = state === "burning";
  const label =
    state === "saving"
      ? "Fortune cat, content"
      : state === "even"
        ? "Fortune cat, watchful"
        : "Fortune cat, alert";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`fc-leaf-${state}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GOLD_HI} />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
      </defs>

      {/* ears */}
      {alarmed ? (
        <>
          <path d="M22 42 L20 20 L41 33 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M78 42 L80 20 L59 33 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M27 38 L30 15 L46 31 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M73 38 L70 15 L54 31 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M31 33 L33 22 L41 30 Z" fill={CREAM} />
          <path d="M69 33 L67 22 L59 30 Z" fill={CREAM} />
        </>
      )}

      {/* body */}
      <path
        d="M24 74 Q24 92 50 92 Q76 92 76 74 Q76 62 50 62 Q24 62 24 74 Z"
        fill={`url(#fc-leaf-${state})`}
        stroke={LINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* raised beckoning paw */}
      <circle cx="78" cy="55" r="8" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" />
      {/* resting paw */}
      <ellipse cx="34" cy="82" rx="7" ry="5" fill={CREAM} stroke={LINE} strokeWidth="1.4" />

      {/* head */}
      <circle cx="50" cy="46" r="27" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" />
      <ellipse cx="50" cy="52" rx="13" ry="9" fill={CREAM} />

      {/* eyes */}
      {state === "saving" && (
        <>
          <path d="M36 44 q5 5 10 0" stroke={LINE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M54 44 q5 5 10 0" stroke={LINE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )}
      {state === "even" && (
        <>
          <circle cx="41" cy="44" r="2.7" fill={LINE} />
          <circle cx="59" cy="44" r="2.7" fill={LINE} />
        </>
      )}
      {alarmed && (
        <>
          <circle cx="41" cy="44" r="4.6" fill="#fff" stroke={LINE} strokeWidth="1.5" />
          <circle cx="59" cy="44" r="4.6" fill="#fff" stroke={LINE} strokeWidth="1.5" />
          <circle cx="41" cy="45" r="2" fill={LINE} />
          <circle cx="59" cy="45" r="2" fill={LINE} />
        </>
      )}

      {/* nose + mouth */}
      <path d="M48.5 49 h3 l-1.5 2 Z" fill={LINE} />
      {state === "saving" && (
        <path d="M45 54 q5 4 10 0" stroke={LINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}
      {state === "even" && <path d="M46 55 h8" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />}
      {alarmed && <ellipse cx="50" cy="57" rx="3" ry="3.6" fill="none" stroke={LINE} strokeWidth="1.6" />}

      {/* whiskers */}
      <path d="M28 45 l-9 -2 M28 49 l-9 2" stroke={LINE} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      <path d="M72 45 l9 -2 M72 49 l9 2" stroke={LINE} strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />

      {/* bell collar */}
      <path d="M34 62 Q50 70 66 62" stroke={BELL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="67" r="3.4" fill={GOLD_HI} stroke={LINE} strokeWidth="1.2" />
      <path d="M47 67 h6" stroke={LINE} strokeWidth="0.9" />

      {/* koban coin at the paw */}
      <ellipse cx="82" cy="70" rx="10" ry="7" fill={GOLD_HI} stroke={LINE} strokeWidth="1.6" transform="rotate(-14 82 70)" />
      <text x="82" y="73.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={LINE} transform="rotate(-14 82 70)">
        金
      </text>
    </svg>
  );
}
