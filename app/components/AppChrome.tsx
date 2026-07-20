"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import ProBadge from "@/app/app/components/ProBadge";
import ThemeToggle from "@/app/components/ThemeToggle";
import SettingsGear from "@/app/components/SettingsGear";
import ShrineStars from "@/app/components/ShrineStars";
import Wordmark from "@/app/components/Wordmark";

type NavName = "home" | "ledger" | "fortunes" | "bills";

function NavIcon({ name }: { name: NavName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      );
    case "ledger":
      return (
        <svg {...common}>
          <path d="M6 3h12v16l-2-1.3L14 19l-2-1.3L10 19l-2-1.3L6 19z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      );
    case "fortunes":
      return (
        <svg {...common}>
          <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" />
          <path d="M14 5v10" strokeDasharray="1.5 2" />
        </svg>
      );
    case "bills":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3.5 7l8.5 6 8.5-6" />
        </svg>
      );
  }
}

const NAV: { href: string; label: string; name: NavName }[] = [
  { href: "/app", label: "Home", name: "home" },
  { href: "/app?tab=ledger", label: "Ledger", name: "ledger" },
  { href: "/app?tab=fortunes", label: "Fortunes", name: "fortunes" },
  { href: "/app?tab=bills", label: "Bills", name: "bills" },
];

/**
 * Shared chrome for the non-dashboard signed-in pages. Mirrors ShrineChrome's
 * top bar (desktop) and bottom nav (mobile) so navigation feels continuous with
 * /app. `wide` opts a page into the roomier column; forms leave it off.
 */
export default function AppChrome({
  userEmail,
  isPro,
  pendingReviewCount,
  wide = false,
  children,
}: {
  userEmail: string;
  isPro: boolean;
  pendingReviewCount: number;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const widthCls = wide ? "sm:max-w-[1200px] sm:px-5" : "sm:max-w-3xl";

  return (
    <div className="relative min-h-screen bg-surface-2">
      <ShrineStars />

      {/* ===== Desktop top bar ===== */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-surface-2/85 backdrop-blur sm:block">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-5 py-3">
          <Link href="/app" aria-label="Fortune Cat home">
            <Wordmark size="sm" />
          </Link>
          {isPro && <ProBadge />}
          <nav className="mx-auto flex items-center gap-1" aria-label="Sections">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
              >
                <NavIcon name={item.name} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <SettingsGear />
            <ThemeToggle variant="compact" />
          </div>
        </div>
      </header>

      {/* ===== Mobile header ===== */}
      <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:hidden">
        <Link href="/app" aria-label="Fortune Cat home">
          <Wordmark size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          {isPro && <ProBadge />}
          <ThemeToggle variant="compact" />
        </div>
      </header>

      {/* ===== Content ===== */}
      <main className={`mx-auto w-full px-4 pb-28 pt-6 sm:px-0 ${widthCls}`}>{children}</main>

      {/* ===== Mobile More sheet ===== */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-surface p-4 pb-24 shadow-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-muted hover:bg-surface-3"
            >
              <span className="w-5 text-center">⚙</span>
              Settings
            </Link>
            {!isPro && (
              <Link
                href="/upgrade"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gold-text hover:bg-gold-soft"
              >
                <span className="w-5 text-center">★</span>
                Go Pro
              </Link>
            )}
            <div className="mt-2 border-t border-line pt-3">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">Appearance</p>
              <div className="px-3 pb-2">
                <ThemeToggle />
              </div>
            </div>
            <div className="mt-1 border-t border-line pt-2">
              <p className="truncate px-3 py-2 font-mono text-xs text-ink-faint">{userEmail}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-ink-muted hover:bg-surface-3"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== Mobile bottom nav ===== */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-end border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Sections"
      >
        <NavItem href="/app" label="Home" name="home" />
        <NavItem href="/app?tab=ledger" label="Ledger" name="ledger" badge={pendingReviewCount} />
        <Link href="/app?add=1" className="flex flex-1 flex-col items-center gap-1 pt-2" aria-label="Log a transaction">
          <span className="btn-gold pressable -mt-5 flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold ring-4 ring-surface">
            ＋
          </span>
          <span className="pb-3 font-mono text-[10px] uppercase tracking-wide text-ink-faint">Log</span>
        </Link>
        <NavItem href="/app?tab=fortunes" label="Fortunes" name="fortunes" />
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-1 pb-3 pt-2.5 font-mono text-[10px] uppercase tracking-wide ${
            moreOpen || pathname.startsWith("/settings") ? "font-semibold text-gold-text" : "text-ink-faint"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <circle cx="5" cy="12" r="1.4" />
            <circle cx="12" cy="12" r="1.4" />
            <circle cx="19" cy="12" r="1.4" />
          </svg>
          More
        </button>
      </nav>
    </div>
  );
}

function NavItem({
  href,
  label,
  name,
  badge = 0,
}: {
  href: string;
  label: string;
  name: NavName;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-1 pb-3 pt-2.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint"
    >
      <span className="relative leading-none">
        <NavIcon name={name} />
        {badge > 0 && (
          <span className="absolute -right-3 -top-1 min-w-[16px] rounded-full bg-vermilion px-1 text-center font-mono text-[9px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}
