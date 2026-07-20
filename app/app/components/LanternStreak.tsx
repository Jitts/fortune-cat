/**
 * Capture streak, marked with a row of paper lanterns — the first N marking
 * an N-day streak. Day/night aware: by day a struck lantern is simply visible
 * (red paper, gold trim, no glow — daylight needs no flame). By night (the
 * Shrine theme) struck lanterns light up with a warm gold glow, as if a
 * candle were lit inside. Unstruck slots stay dim/unpainted in both themes.
 */
function Lantern({ lit }: { lit: boolean }) {
  return (
    <svg
      width="16"
      height="21"
      viewBox="0 0 20 26"
      aria-hidden
      className="shrink-0"
      style={
        lit
          ? { filter: "var(--lantern-glow, none)" }
          : undefined
      }
    >
      {/* hanging loop */}
      <line x1="10" y1="0.5" x2="10" y2="3" stroke="var(--ink-faint)" strokeWidth="1" opacity={lit ? 0.7 : 0.4} />
      {/* top cap */}
      <path d="M6 3.5h8l-1.4 2.5H7.4Z" fill={lit ? "var(--leaf-hi)" : "var(--line)"} />
      {/* paper body — bulges in the middle, tapers at both caps */}
      <path
        d="M7.4 6C4 6 2.2 9 2.2 13S4 20 7.4 20h5.2c3.4 0 5.2-3 5.2-7S16 6 12.6 6Z"
        fill={lit ? "var(--seal)" : "var(--line)"}
        opacity={lit ? 1 : 0.4}
      />
      {/* rib lines */}
      <g stroke={lit ? "var(--leaf-lo)" : "var(--surface)"} strokeWidth="0.7" opacity={lit ? 0.55 : 0.3}>
        <path d="M3.3 10h13.4" fill="none" />
        <path d="M2.7 13h14.6" fill="none" />
        <path d="M3.3 16h13.4" fill="none" />
      </g>
      {/* bottom cap */}
      <path d="M7.4 20h5.2l-1.4 2.2H8.8Z" fill={lit ? "var(--leaf-hi)" : "var(--line)"} />
      {/* tassel */}
      <line x1="10" y1="22.2" x2="10" y2="25" stroke={lit ? "var(--leaf-lo)" : "var(--line)"} strokeWidth="1" opacity={lit ? 0.8 : 0.4} />
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
  const lit = Math.max(0, count);
  const slots = Math.max(total, lit);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-end gap-1 dark:[--lantern-glow:drop-shadow(0_0_4px_color-mix(in_oklab,var(--gold)_70%,transparent))]">
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
