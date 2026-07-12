/**
 * The fortune cat itself — a gold maneki-neko whose mood is a pure function
 * of this month's cash flow. No AI, no randomness: saving = content, even =
 * watchful, burning = alarmed. Gold per design/DESIGN.md; red stays reserved
 * for real problems elsewhere in the app.
 */

export type CatState = "saving" | "even" | "burning";

export function catState(net: number, burnDelta: number | null): CatState {
  if (net < 0 || (burnDelta != null && burnDelta > 30)) return "burning";
  if (net > 0) return "saving";
  return "even";
}

const GOLD = "#ffd700";
const GOLD_DEEP = "#705d00";
const GOLD_SOFT = "#f6e8b0";
const CREAM = "#fff8dc";

export default function FortuneCat({ state, size = 76 }: { state: CatState; size?: number }) {
  const alarmed = state === "burning";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Fortune cat — ${state}`}
      className="shrink-0"
    >
      {/* ears — swept back when alarmed */}
      {alarmed ? (
        <>
          <polygon points="20,40 20,16 40,30" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="1.5" />
          <polygon points="80,40 80,16 60,30" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <polygon points="26,36 31,12 44,28" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="1.5" />
          <polygon points="74,36 69,12 56,28" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="1.5" />
          <polygon points="30,31 33,19 40,27" fill={GOLD_SOFT} />
          <polygon points="70,31 67,19 60,27" fill={GOLD_SOFT} />
        </>
      )}

      {/* body + raised beckoning paw */}
      <ellipse cx="50" cy="79" rx="26" ry="17" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="1.5" />
      <circle cx="77" cy="52" r="7" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="1.5" />

      {/* head */}
      <circle cx="50" cy="46" r="28" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="1.5" />
      <ellipse cx="50" cy="53" rx="14" ry="10" fill={CREAM} />

      {/* eyes */}
      {state === "saving" && (
        <>
          <path d="M35 43 q5 -6 10 0" stroke={GOLD_DEEP} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M55 43 q5 -6 10 0" stroke={GOLD_DEEP} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )}
      {state === "even" && (
        <>
          <circle cx="40" cy="43" r="2.8" fill={GOLD_DEEP} />
          <circle cx="60" cy="43" r="2.8" fill={GOLD_DEEP} />
        </>
      )}
      {alarmed && (
        <>
          <circle cx="40" cy="43" r="5" fill="#fff" stroke={GOLD_DEEP} strokeWidth="1.6" />
          <circle cx="60" cy="43" r="5" fill="#fff" stroke={GOLD_DEEP} strokeWidth="1.6" />
          <circle cx="40" cy="44" r="2" fill={GOLD_DEEP} />
          <circle cx="60" cy="44" r="2" fill={GOLD_DEEP} />
        </>
      )}

      {/* nose + mouth */}
      <circle cx="50" cy="50" r="1.7" fill={GOLD_DEEP} />
      {state === "saving" && (
        <path d="M45 55 q5 5 10 0" stroke={GOLD_DEEP} strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      {state === "even" && (
        <path d="M45 56 h10" stroke={GOLD_DEEP} strokeWidth="2" strokeLinecap="round" />
      )}
      {alarmed && (
        <ellipse cx="50" cy="57" rx="3.2" ry="4.2" fill="none" stroke={GOLD_DEEP} strokeWidth="1.8" />
      )}

      {/* whiskers */}
      <path d="M27 46 l-9 -2 M27 50 l-9 2" stroke={GOLD_DEEP} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path d="M73 46 l9 -2 M73 50 l9 2" stroke={GOLD_DEEP} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />

      {/* the 福 coin */}
      <ellipse cx="50" cy="83" rx="12" ry="8.5" fill={GOLD_SOFT} stroke={GOLD_DEEP} strokeWidth="1.4" />
      <text x="50" y="86.5" textAnchor="middle" fontSize="9" fill={GOLD_DEEP} fontWeight="bold">
        福
      </text>
    </svg>
  );
}
