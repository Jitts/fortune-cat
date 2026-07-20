/**
 * The Daruma — a good-luck talisman for Fortune Goals. A round wish-doll
 * modelled on the tradition: you paint one eye when you SET a wish, the
 * other when it COMES TRUE. Here the left eye is always painted (the goal is
 * set) and the right eye fills as `progress` climbs from 0 → 1, fully
 * painted the moment a goal is reached. Body/base use the same --seal and
 * --leaf-hi/--leaf-lo tokens as the seal stamp and the luck coin, so it sits
 * naturally in either theme. Pure SVG, no hooks — safe in server trees too.
 */
export default function Daruma({
  progress,
  size = 44,
  className,
}: {
  /** 0–1. Right-eye fill; 1 = wish fulfilled (goal reached). */
  progress: number;
  size?: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const done = p >= 1;
  // Right pupil grows from nothing to match the left as the wish is fulfilled.
  const rightPupil = 5 * p;
  const label = done
    ? "Daruma — wish fulfilled, both eyes painted"
    : `Daruma — wish set, ${Math.round(p * 100)}% of the way there`;

  return (
    <svg
      viewBox="0 0 100 108"
      width={size}
      height={(size * 108) / 100}
      className={className}
      role="img"
      aria-label={label}
      style={{
        filter: done ? "drop-shadow(0 0 6px color-mix(in oklab, var(--gold) 65%, transparent))" : undefined,
        transition: "filter .5s ease",
      }}
    >
      <defs>
        <linearGradient id="daruma-body" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--seal) 55%, white)" }} />
          <stop offset="0.5" stopColor="var(--seal)" />
          <stop offset="1" style={{ stopColor: "color-mix(in oklab, var(--seal) 80%, black)" }} />
        </linearGradient>
        <radialGradient id="daruma-sheen" cx="0.32" cy="0.24" r="0.5">
          <stop offset="0" stopColor="white" stopOpacity="0.5" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id="daruma-clip">
          <path d="M50 5C77 5 91 25 91 53c0 34-16 50-41 50S9 87 9 53C9 25 23 5 50 5Z" />
        </clipPath>
      </defs>

      {/* lacquer body — round, weighted, with a soft glossy sheen */}
      <path
        d="M50 5C77 5 91 25 91 53c0 34-16 50-41 50S9 87 9 53C9 25 23 5 50 5Z"
        fill="url(#daruma-body)"
        style={{ stroke: "color-mix(in oklab, var(--seal) 70%, black)" }}
        strokeWidth="2"
      />
      <path d="M50 5C77 5 91 25 91 53c0 34-16 50-41 50S9 87 9 53C9 25 23 5 50 5Z" fill="url(#daruma-sheen)" />

      {/* weighted gold base (clipped to the body silhouette) — the same
          metallic-leaf stops as the luck coin, with a small seal medallion */}
      <g clipPath="url(#daruma-clip)">
        <rect x="9" y="88" width="82" height="18" fill="var(--leaf-hi)" />
        <rect x="9" y="88" width="82" height="3" fill="var(--leaf-lo)" opacity="0.65" />
        <circle cx="50" cy="97" r="6.5" fill="var(--seal)" opacity="0.9" />
      </g>

      {/* unpainted face field — the same warm stock as the fortune slip */}
      <ellipse
        cx="50"
        cy="47"
        rx="29"
        ry="32"
        fill="var(--paper)"
        style={{ stroke: "color-mix(in oklab, var(--seal) 70%, black)" }}
        strokeWidth="1.6"
      />

      {/* cheeks — a small warm blush */}
      <circle cx="28" cy="60" r="4.5" fill="color-mix(in oklab, var(--seal) 35%, var(--paper))" opacity="0.7" />
      <circle cx="72" cy="60" r="4.5" fill="color-mix(in oklab, var(--seal) 35%, var(--paper))" opacity="0.7" />

      {/* bold crane-wing brows */}
      <path d="M24 38C30 30 39 30 45 37" fill="none" stroke="var(--on-gold)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M55 37C61 30 70 30 76 38" fill="none" stroke="var(--on-gold)" strokeWidth="3.4" strokeLinecap="round" />

      {/* eye whites */}
      <circle cx="36" cy="52" r="10.5" fill="#ffffff" style={{ stroke: "var(--on-gold)" }} strokeWidth="1.8" />
      <circle cx="64" cy="52" r="10.5" fill="#ffffff" style={{ stroke: "var(--on-gold)" }} strokeWidth="1.8" />

      {/* left pupil — always painted (the wish is set) */}
      <circle cx="36" cy="52" r="5" fill="var(--on-gold)" />
      {/* right pupil — painted in as the wish is fulfilled */}
      <circle
        cx="64"
        cy="52"
        r={rightPupil}
        fill="var(--on-gold)"
        style={{ transition: "r .5s var(--ease-out-quart, ease)" }}
      />

      {/* traditional handlebar mustache */}
      <path
        d="M31 75C37 82 46 82 50 76C54 82 63 82 69 75"
        fill="none"
        stroke="var(--on-gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
