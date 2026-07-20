/**
 * A small static gold "cash coin" glyph — the same square-holed coin of
 * prosperity as the luck medallion, sized for inline use next to section
 * titles (replaces a plain emoji prefix). Always struck gold; decorative.
 */
export default function CoinGlyph({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="var(--gold)"
        stroke="var(--gold-text)"
        strokeWidth="1.4"
        style={{ filter: "drop-shadow(0 0 2px color-mix(in oklab, var(--gold) 55%, transparent))" }}
      />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="none" stroke="var(--on-gold)" strokeWidth="1.4" opacity="0.85" />
    </svg>
  );
}
