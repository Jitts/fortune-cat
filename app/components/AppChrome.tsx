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

const TABS: NavItem[] = [
  { href: "/app", label: "Pulse", glyph: "◉", match: (p) => p === "/app" },
  { href: "/review", label: "Review", glyph: "👀" },
  { href: "/app?add=1", label: "Add", glyph: "＋", match: () => false },
  { href: "/settings", label: "Capture", glyph: "📡" },
];

function isActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname.startsWith(item.href);
}

/**
 * Shared navigation chrome: a bottom tab bar on mobile (Pulse · Review · Add ·
 * Capture · More) and a hamburger + left drawer on desktop. Wraps every
 * signed-in screen so the app feels like one surface, not linked pages.
 */
export default function AppChrome({
  userEmail,
  isPro,
  pendingReviewCount,
  children,
}: {
  userEmail: string;
  isPro: boolean;
  pendingReviewCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const badge =
    pendingReviewCount > 0 ? (
      <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber-100 px-1 font-mono text-[10px] font-semibold text-amber-800">
        {pendingReviewCount}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ===== Header ===== */}
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 pt-6 sm:px-10 sm:pt-10">
        <div className="flex items-center gap-3">
          {/* Hamburger — desktop only; mobile navigates with the bottom bar */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="hidden h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-lg ring-1 ring-neutral-300 hover:bg-neutral-100 sm:flex"
          >
            <span className="h-0.5 w-4 rounded bg-neutral-700" />
            <span className="h-0.5 w-4 rounded bg-neutral-700" />
            <span className="h-0.5 w-4 rounded bg-neutral-700" />
          </button>
          <Link href="/app" className="text-2xl font-bold tracking-tight text-neutral-900">
            🐱 Fortune Cat
          </Link>
          {isPro && <ProBadge />}
        </div>
        <div className="flex items-center gap-3">
          {!isPro && (
            <Link
              href="/upgrade"
              className="hidden rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 sm:inline"
            >
              Go Pro
            </Link>
          )}
          <span className="hidden text-sm text-neutral-500 lg:inline">{userEmail}</span>
        </div>
      </header>

      {/* ===== Page content ===== */}
      <main className="mx-auto max-w-3xl space-y-6 p-6 pb-28 sm:p-10 sm:pt-6">{children}</main>

      {/* ===== Desktop drawer ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 hidden sm:block">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight text-neutral-900">🐱 Fortune Cat</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {TABS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
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
              <Link
                href="/feedback"
                onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  pathname.startsWith("/feedback")
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <span className="w-5 text-center">💡</span>
                Feature requests
              </Link>
              {!isPro && (
                <Link
                  href="/upgrade"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
                >
                  <span className="w-5 text-center">⭐</span>
                  Go Pro
                </Link>
              )}
            </div>
            <div className="mt-auto border-t border-neutral-100 pt-4">
              <p className="truncate px-3 pb-3 text-xs text-neutral-400">{userEmail}</p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}

      {/* ===== Mobile "More" sheet ===== */}
      {moreOpen && (
        <div className="fixed inset-0 z-30 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-24 shadow-xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200" />
            <Link
              href="/feedback"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <span className="w-5 text-center">💡</span>
              Feature requests
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
