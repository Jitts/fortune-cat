/**
 * Lantern streak (Direction B): a row of paper lanterns 🏮, the first N marking
 * an N-day streak. Day/night aware — by day the streak lanterns simply hang red
 * ("off"); at night (the Shrine theme) they light up with a warm gold glow. The
 * remaining slots stay dim in both themes. Uses the emoji so the lanterns match
 * the approved mockup.
 */
function Lantern({ lit }: { lit: boolean }) {
  return (
    <span
      aria-hidden
      className={`text-lg leading-none ${
        lit
          ? "opacity-90 dark:opacity-100 dark:[filter:brightness(1.15)_drop-shadow(0_0_5px_rgba(255,176,32,0.9))]"
          : "opacity-30 grayscale"
      }`}
    >
      🏮
    </span>
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
