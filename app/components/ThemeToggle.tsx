"use client";

import { useEffect, useState } from "react";
import {
  THEME_KEY,
  effectiveTheme,
  isThemePref,
  resolveAutoTheme,
  type EffectiveTheme,
  type ThemePref,
} from "@/lib/theme";

function apply(pref: ThemePref) {
  const eff = effectiveTheme(pref);
  document.documentElement.classList.toggle("dark", eff === "dark");
}

/**
 * Theme control. `variant="full"` is the Light / Dark / Auto segmented picker
 * (Settings, the mobile More sheet); `variant="compact"` is a single ☾/☀
 * quick-toggle for the nav that flips to the opposite theme and remembers it.
 * The no-flash script in layout.tsx has already set the class before paint —
 * this only reflects and updates it.
 */
export default function ThemeToggle({ variant = "full" }: { variant?: "full" | "compact" }) {
  const [pref, setPref] = useState<ThemePref>("auto");
  const [mounted, setMounted] = useState(false);
  const [effective, setEffective] = useState<EffectiveTheme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initial: ThemePref = isThemePref(stored) ? stored : "auto";
    setPref(initial);
    setEffective(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setMounted(true);

    // While the app is open in Auto, flip at the day/evening boundary on its own.
    const recheck = () => {
      const p = localStorage.getItem(THEME_KEY);
      if (p && p !== "auto") return;
      const eff = resolveAutoTheme();
      document.documentElement.classList.toggle("dark", eff === "dark");
      setEffective(eff);
    };
    const id = window.setInterval(recheck, 30 * 60 * 1000);
    window.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, []);

  function choose(next: ThemePref) {
    localStorage.setItem(THEME_KEY, next);
    apply(next);
    setPref(next);
    setEffective(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }

  // Avoid a hydration mismatch — the true theme is only known on the client.
  if (!mounted) {
    return variant === "compact" ? (
      <span className="inline-block h-8 w-8" aria-hidden />
    ) : (
      <div className="h-9" aria-hidden />
    );
  }

  if (variant === "compact") {
    const goDark = effective === "light";
    return (
      <button
        onClick={() => choose(goDark ? "dark" : "light")}
        aria-label={goDark ? "Switch to Shrine (dark)" : "Switch to daylight (light)"}
        title={goDark ? "Switch to Shrine" : "Switch to daylight"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-3 max-sm:h-11 max-sm:w-11"
      >
        {goDark ? "☾" : "☀"}
      </button>
    );
  }

  const options: { value: ThemePref; label: string; glyph: string }[] = [
    { value: "auto", label: "Auto", glyph: "◐" },
    { value: "light", label: "Light", glyph: "☀" },
    { value: "dark", label: "Shrine", glyph: "☾" },
  ];

  return (
    <div className="inline-flex rounded-xl border border-line p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => choose(o.value)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            pref === o.value ? "bg-action text-white" : "text-ink-muted hover:bg-surface-3"
          }`}
        >
          <span aria-hidden>{o.glyph}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
