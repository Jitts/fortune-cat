/**
 * The fortune cat — a minted maneki-neko whose expression is a pure function of
 * this month's cash flow. No AI, no randomness: saving = content (eyes closed,
 * calm), even = watchful, burning = alert. Gold leaf on a lacquer outline; the
 * one mark used everywhere from the 24px wordmark to the dashboard hero, so
 * the silhouette is kept deliberately simple — one rounded body, one pendant,
 * no fine detail that turns to mush at logo size. Red is never used here —
 * attention lives elsewhere.
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

      {/* ears — one simple fold each; alarmed pulls them back and flat */}
      {alarmed ? (
        <>
          <path d="M22 38 L11 22 L36 28 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M78 38 L89 22 L64 28 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M26 30 L20 10 L42 24 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M74 30 L80 10 L58 24 Z" fill={`url(#fc-leaf-${state})`} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M29 26 L26 15 L38 23 Z" fill={CREAM} />
          <path d="M71 26 L74 15 L62 23 Z" fill={CREAM} />
        </>
      )}

      {/* one rounded body+head silhouette — no separate paw, coin, or collar
          floating off the mark, so it stays crisp at logo size */}
      <path
        d="M50 12 C70 12 82 28 82 48 C82 64 79 74 72 81 C64 89 56 92 50 92
           C44 92 36 89 28 81 C21 74 18 64 18 48 C18 28 30 12 50 12 Z"
        fill={`url(#fc-leaf-${state})`}
        stroke={LINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* face patch */}
      <ellipse cx="50" cy="53" rx="17" ry="13" fill={CREAM} />

      {/* eyes */}
      {state === "saving" && (
        <>
          <path d="M35 43 q5 5 10 0" stroke={LINE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M55 43 q5 5 10 0" stroke={LINE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )}
      {state === "even" && (
        <>
          <circle cx="40" cy="43" r="2.8" fill={LINE} />
          <circle cx="60" cy="43" r="2.8" fill={LINE} />
        </>
      )}
      {alarmed && (
        <>
          <circle cx="40" cy="43" r="4.8" fill="#fff" stroke={LINE} strokeWidth="1.5" />
          <circle cx="60" cy="43" r="4.8" fill="#fff" stroke={LINE} strokeWidth="1.5" />
          <circle cx="40" cy="44" r="2.1" fill={LINE} />
          <circle cx="60" cy="44" r="2.1" fill={LINE} />
        </>
      )}

      {/* nose + mouth */}
      <path d="M48 50 h4 l-2 2.3 Z" fill={LINE} />
      {state === "saving" && (
        <path d="M44 56 q6 4.5 12 0" stroke={LINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}
      {state === "even" && <path d="M45 57 h10" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />}
      {alarmed && <ellipse cx="50" cy="59" rx="3.2" ry="3.8" fill="none" stroke={LINE} strokeWidth="1.6" />}

      {/* pendant — the one accessory, gold on a thin cord */}
      <path d="M50 66 v6" stroke={GOLD} strokeWidth="1.6" />
      <circle cx="50" cy="76" r="5.5" fill={GOLD_HI} stroke={LINE} strokeWidth="1.4" />
      <circle cx="48.3" cy="74.3" r="1.3" fill="#fff" opacity="0.7" />
    </svg>
  );
}
