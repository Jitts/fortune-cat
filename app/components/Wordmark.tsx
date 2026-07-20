import FortuneCat from "@/app/app/components/FortuneCat";

/**
 * The brand lockup: the minted cat mark + "Fortune Cat" in the display face.
 * One component so the wordmark is identical on the landing header, footer, and
 * the in-app chrome. The cat rests in its content ("saving") state as a logo.
 */
export default function Wordmark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const mark = size === "lg" ? 34 : size === "sm" ? 24 : 28;
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <FortuneCat state="saving" size={mark} />
      <span className={`font-display font-extrabold tracking-tight text-ink ${text}`}>
        Fortune&nbsp;Cat
      </span>
    </span>
  );
}
