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
  const rightPupil = 4.2 * p;
  const label = done
    ? "Daruma — wish fulfilled, both eyes painted"
    : `Daruma — wish set, ${Math.round(p * 100)}% of the way there`;

  return (
    <svg
      viewBox="0 0 100 110"
      width={size}
      height={(size * 110) / 100}
      className={className}
      role="img"
      aria-label={label}
      style={{
        filter: done ? "drop-shadow(0 0 6px color-mix(in oklab, var(--gold) 60%, transparent))" : undefined,
        transition: "filter .5s ease",
      }}
    >
      <defs>
        <linearGradient id="daruma-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in oklab, var(--seal) 62%, white)" }} />
          <stop offset="1" stopColor="var(--seal)" />
        </linearGradient>
        <clipPath id="daruma-clip">
          <path d="M50 8C72 8 84 26 84 50c0 32-12 52-34 52S16 82 16 50C16 26 28 8 50 8Z" />
        </clipPath>
      </defs>

      {/* lacquer body */}
      <path
        d="M50 8C72 8 84 26 84 50c0 32-12 52-34 52S16 82 16 50C16 26 28 8 50 8Z"
        fill="url(#daruma-body)"
        style={{ stroke: "color-mix(in oklab, var(--seal) 65%, black)" }}
        strokeWidth="1.5"
      />
      {/* weighted gold base (clipped to the body silhouette) — the same
          metallic-leaf stops as the luck coin */}
      <g clipPath="url(#daruma-clip)">
        <rect x="12" y="90" width="76" height="16" fill="var(--leaf-hi)" />
        <rect x="12" y="90" width="76" height="2.5" fill="var(--leaf-lo)" opacity="0.6" />
      </g>

      {/* unpainted face field — the same warm stock as the fortune slip */}
      <ellipse cx="50" cy="49" rx="25" ry="29" fill="var(--paper)" />

      {/* crane-wing brows */}
      <path d="M28 41C33 35 40 35 45 40" fill="none" stroke="var(--on-gold)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M55 40C60 35 67 35 72 41" fill="none" stroke="var(--on-gold)" strokeWidth="2.4" strokeLinecap="round" />

      {/* eye whites */}
      <circle cx="39" cy="52" r="9" fill="#ffffff" stroke="var(--on-gold)" strokeWidth="1.4" />
      <circle cx="61" cy="52" r="9" fill="#ffffff" stroke="var(--on-gold)" strokeWidth="1.4" />

      {/* left pupil — always painted (the wish is set) */}
      <circle cx="39" cy="52" r="4.2" fill="var(--on-gold)" />
      {/* right pupil — painted in as the wish is fulfilled */}
      <circle
        cx="61"
        cy="52"
        r={rightPupil}
        fill="var(--on-gold)"
        style={{ transition: "r .5s var(--ease-out-quart, ease)" }}
      />

      {/* tortoise mustache — a small friendly flourish */}
      <path d="M42 68C45 73 55 73 58 68" fill="none" stroke="var(--on-gold)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
