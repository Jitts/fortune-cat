"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import ProBadge from "@/app/app/components/ProBadge";

type NavItem = {
  href: string;
  label: string;
  glyph: string;
  match?: (pathname: string) => boolean;
};

// The four primary destinations — also the mobile bottom tab bar.
const TABS: NavItem[] = [
  { href: "/app", label: "Pulse", glyph: "◉", match: (p) => p === "/app" },
  { href: "/review", label: "Review", glyph: "👀" },
  { href: "/app?add=1", label: "Add", glyph: "＋", match: () => false },
  { href: "/settings", label: "Capture", glyph: "📡" },
];

// The full desktop rail: the four tabs plus the "More" destinations, in one
// persistent list.
const SIDEBAR_NAV: NavItem[] = [
  ...TABS,
  { href: "/insights", label: "Analytics", glyph: "📈" },
  { href: "/feedback", label: "Feature requests", glyph: "💡" },
  { href: "/account", label: "Account & privacy", glyph: "👤" },
];

function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname.startsWith(item.href);
}

/**
 * Shared navigation chrome. On desktop a persistent, full-height left sidebar
 * homes the whole nav plus the account footer (email + sign out); on mobile the
 * same destinations split across a bottom tab bar (Pulse · Review · Add ·
 * Capture · More) and a "More" sheet. Wraps every signed-in screen so the app
 * feels like one surface, not linked pages.
 *
 * `wide` opts a page into the roomier content column (the dashboard); form-shaped
 * pages like Account/Settings leave it off and keep the comfortable measure.
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

  const badge =
    pendingReviewCount > 0 ? (
      <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber-100 px-1 font-mono text-[10px] font-semibold text-amber-800">
        {pendingReviewCount}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ===== Desktop sidebar (full height) ===== */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-neutral-200 bg-white px-3 py-5 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Link href="/app" className="text-lg font-bold tracking-tight text-neutral-900">
            🐱 Fortune Cat
          </Link>
          {isPro && <ProBadge />}
        </div>

        <nav className="flex flex-col gap-1">
          {SIDEBAR_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive(item, pathname)
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="w-5 text-center">{item.glyph}</span>
              {item.label === "Add" ? "Add transaction" : item.label}
              {item.label === "Review" && badge}
            </Link>
          ))}
          {!isPro && (
            <Link
              href="/upgrade"
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              <span className="w-5 text-center">⭐</span>
              Go Pro
            </Link>
          )}
        </nav>

        <div className="mt-auto border-t border-neutral-100 pt-4">
          <p className="truncate px-3 pb-2 text-xs text-neutral-400">{userEmail}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ===== Content column (offset past the sidebar on desktop) ===== */}
      <div className="sm:pl-60">
        {/* Mobile-only header — desktop shows the brand in the sidebar */}
        <header className="flex items-center justify-between gap-3 px-6 pt-6 sm:hidden">
          <Link href="/app" className="text-2xl font-bold tracking-tight text-neutral-900">
            🐱 Fortune Cat
          </Link>
          {isPro && <ProBadge />}
        </header>

        <main className={`mx-auto ${wide ? "max-w-5xl" : "max-w-3xl"} space-y-6 p-6 pb-28 sm:p-10`}>
          {children}
        </main>
      </div>

      {/* ===== Mobile "More" sheet ===== */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-24 shadow-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200" />
            <Link
              href="/insights"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <span className="w-5 text-center">📈</span>
              Analytics
            </Link>
            <Link
              href="/feedback"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <span className="w-5 text-center">💡</span>
              Feature requests
            </Link>
            <Link
              href="/account"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <span className="w-5 text-center">👤</span>
              Account &amp; privacy
            </Link>
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
            <div className="mt-2 border-t border-neutral-100 pt-2">
              <p className="truncate px-3 py-2 text-xs text-neutral-400">{userEmail}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== Mobile bottom tab bar ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        {TABS.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 pb-3 pt-2 font-mono text-[10px] uppercase tracking-wide ${
                active ? "font-semibold text-emerald-700" : "text-neutral-400"
              }`}
            >
              <span className="relative text-base leading-none">
                {item.glyph}
                {item.label === "Review" && pendingReviewCount > 0 && (
                  <span className="absolute -right-3 -top-1 min-w-[16px] rounded-full bg-amber-400 px-1 text-center font-mono text-[9px] font-bold text-white">
                    {pendingReviewCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 pb-3 pt-2 font-mono text-[10px] uppercase tracking-wide ${
            moreOpen ? "font-semibold text-emerald-700" : "text-neutral-400"
          }`}
        >
          <span className="text-base leading-none">⚙</span>
          More
        </button>
      </nav>
    </div>
  );
}
