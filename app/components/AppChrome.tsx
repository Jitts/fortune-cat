"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import ProBadge from "@/app/app/components/ProBadge";
import ThemeToggle from "@/app/components/ThemeToggle";
import ShrineStars from "@/app/components/ShrineStars";

// The same top-tab nav as the Shrine dashboard, so the peripheral pages
// (Settings, Account, Analytics, Feature requests, Review) share one chrome
// instead of flipping back to a different layout. The dashboard tabs are links
// back to /app?tab=…; the current section (e.g. Settings) is highlighted.
const NAV = [
  { href: "/app", label: "Home", match: (p: string) => false },
  { href: "/app?tab=ledger", label: "Ledger", match: () => false },
  { href: "/app?tab=fortunes", label: "Fortunes", match: () => false },
  { href: "/app?tab=bills", label: "Bills", match: () => false },
  { href: "/settings", label: "Settings", match: (p: string) => p.startsWith("/settings") },
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
          <Link href="/app" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
            🏮 Fortune Cat
          </Link>
          {isPro && <ProBadge />}
          <nav className="mx-auto flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle variant="compact" />
        </div>
      </header>

      {/* ===== Mobile header ===== */}
      <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:hidden">
        <Link href="/app" className="text-xl font-bold tracking-tight text-ink">
          🏮 Fortune Cat
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-surface p-4 pb-24 shadow-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            {[
              { href: "/settings", glyph: "📡", label: "Capture & settings" },
              { href: "/insights", glyph: "📈", label: "Analytics" },
              { href: "/feedback", glyph: "💡", label: "Feature requests" },
              { href: "/account", glyph: "👤", label: "Account & privacy" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-muted hover:bg-surface-3"
              >
                <span className="w-5 text-center">{item.glyph}</span>
                {item.label}
              </Link>
            ))}
            {!isPro && (
              <Link
                href="/upgrade"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50"
              >
                <span className="w-5 text-center">⭐</span>
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
              <p className="truncate px-3 py-2 text-xs text-ink-faint">{userEmail}</p>
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
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
        <NavItem href="/app" label="Home" glyph="🏮" active={false} />
        <NavItem href="/app?tab=ledger" label="Ledger" glyph="📜" active={false} badge={pendingReviewCount} />
        <Link href="/app?add=1" className="flex flex-1 flex-col items-center gap-1 pt-2">
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-fortune-400 text-2xl font-bold text-fortune-700 shadow-lg ring-4 ring-surface">
            ＋
          </span>
          <span className="pb-3 font-mono text-[10px] uppercase tracking-wide text-ink-faint">Log</span>
        </Link>
        <NavItem href="/app?tab=fortunes" label="Fortunes" glyph="🎴" active={false} />
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 pb-3 pt-2 font-mono text-[10px] uppercase tracking-wide ${
            moreOpen || pathname.startsWith("/settings") || pathname.startsWith("/account") || pathname.startsWith("/insights") || pathname.startsWith("/feedback")
              ? "font-semibold text-emerald-700 dark:text-emerald-400"
              : "text-ink-faint"
          }`}
        >
          <span className="text-base leading-none">⚙</span>
          More
        </button>
      </nav>
    </div>
  );
}

function NavItem({
  href,
  label,
  glyph,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  glyph: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 pb-3 pt-2 font-mono text-[10px] uppercase tracking-wide ${
        active ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-ink-faint"
      }`}
    >
      <span className="relative text-base leading-none">
        {glyph}
        {badge > 0 && (
          <span className="absolute -right-3 -top-1 min-w-[16px] rounded-full bg-amber-400 px-1 text-center font-mono text-[9px] font-bold text-white">
            {badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}
