"use client";

import { useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import ProBadge from "./ProBadge";
import ThemeToggle from "@/app/components/ThemeToggle";
import SettingsGear from "@/app/components/SettingsGear";
import ShrineStars from "@/app/components/ShrineStars";

export type ShrineTab = "home" | "ledger" | "fortunes" | "bills";

const TABS: { id: ShrineTab; label: string; glyph: string }[] = [
  { id: "home", label: "Home", glyph: "🏮" },
  { id: "ledger", label: "Ledger", glyph: "📜" },
  { id: "fortunes", label: "Fortunes", glyph: "🎴" },
  { id: "bills", label: "Bills", glyph: "🧧" },
];

/**
 * The Shrine dashboard chrome (replaces AppChrome on /app): a top tab bar on
 * desktop (Home · Ledger · Fortunes · Bills · Settings) and a bottom nav on
 * mobile (Home · Ledger · gold LOG · Fortunes · More). Tabs switch in-page; the
 * LOG button opens the add sheet; More holds Settings/Account and the theme.
 */
export default function ShrineChrome({
  active,
  onTab,
  onAdd,
  userEmail,
  isPro,
  pendingReviewCount,
  children,
}: {
  active: ShrineTab;
  onTab: (t: ShrineTab) => void;
  onAdd: () => void;
  userEmail: string;
  isPro: boolean;
  pendingReviewCount: number;
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

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
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active === t.id
                    ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <SettingsGear />
            <ThemeToggle variant="compact" />
          </div>
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
      <main className="mx-auto w-full px-4 pb-28 pt-5 sm:max-w-[1200px] sm:px-5 sm:pt-6">
        {children}
      </main>

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
        {[TABS[0], TABS[1]].map((t) => (
          <NavItem key={t.id} label={t.label} glyph={t.glyph} active={active === t.id} badge={t.id === "ledger" ? pendingReviewCount : 0} onClick={() => onTab(t.id)} />
        ))}
        <button onClick={onAdd} className="flex flex-1 flex-col items-center gap-1 pt-2">
          <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-fortune-400 text-2xl font-bold text-fortune-700 shadow-lg ring-4 ring-surface">
            ＋
          </span>
          <span className="pb-3 font-mono text-[10px] uppercase tracking-wide text-ink-faint">Log</span>
        </button>
        <NavItem label={TABS[2].label} glyph={TABS[2].glyph} active={active === "fortunes"} onClick={() => onTab("fortunes")} />
        <NavItem label="More" glyph="⚙" active={moreOpen} onClick={() => setMoreOpen(true)} />
      </nav>
    </div>
  );
}

function NavItem({
  label,
  glyph,
  active,
  badge = 0,
  onClick,
}: {
  label: string;
  glyph: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
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
    </button>
  );
}
