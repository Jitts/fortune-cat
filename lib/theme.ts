/**
 * Theme model (pure). Fortune Cat follows the sun: light by day, dark "Shrine"
 * by evening — with a manual Light/Dark/Auto override remembered per device.
 * The boundary is fixed hours (≈ SG sunrise/sunset year-round, so no
 * geolocation is needed). Keep this in sync with the inline no-flash script in
 * app/layout.tsx, which reimplements resolveAutoTheme in plain JS.
 */

export type ThemePref = "light" | "dark" | "auto";
export type EffectiveTheme = "light" | "dark";

export const THEME_KEY = "fortune-theme";

// Day is [DAY_START, DAY_END); outside that window it's the Shrine.
export const DAY_START_HOUR = 7; // 07:00 → light
export const DAY_END_HOUR = 19; // 19:00 → dark

/** Time-of-day theme from the local clock. */
export function resolveAutoTheme(date = new Date()): EffectiveTheme {
  const h = date.getHours();
  return h >= DAY_START_HOUR && h < DAY_END_HOUR ? "light" : "dark";
}

/** The theme actually shown, given the saved preference and the clock. */
export function effectiveTheme(pref: ThemePref, date = new Date()): EffectiveTheme {
  return pref === "auto" ? resolveAutoTheme(date) : pref;
}

export function isThemePref(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "auto";
}
