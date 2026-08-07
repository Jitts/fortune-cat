"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The way back to the FAQ from inside the app.
 *
 * Sits beside the settings gear because it answers the same shape of question,
 * and because until this existed the signed-in app had no route to the FAQ at
 * all — every wordmark points at /app, so re-reading an answer meant signing
 * out. Mirrors SettingsGear's sizing exactly, including the larger touch
 * target below the sm breakpoint.
 */
export default function HelpLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/faq");
  return (
    <Link
      href="/faq"
      aria-label="Help and FAQ"
      title="Help &amp; FAQ"
      aria-current={active ? "page" : undefined}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold transition max-sm:h-11 max-sm:w-11 ${
        active
          ? "bg-surface text-ink shadow-sm ring-1 ring-line"
          : "text-ink-muted hover:bg-surface-3 hover:text-ink"
      }`}
    >
      ?
    </Link>
  );
}
