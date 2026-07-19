"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The settings entry point — a gear icon that lives up in the top-right next to
 * the theme toggle (rather than as a nav tab). Highlights while on /settings.
 */
export default function SettingsGear() {
  const pathname = usePathname();
  const active = pathname.startsWith("/settings");
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      title="Settings"
      aria-current={active ? "page" : undefined}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition max-sm:h-11 max-sm:w-11 ${
        active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-muted hover:bg-surface-3 hover:text-ink"
      }`}
    >
      ⚙
    </Link>
  );
}
