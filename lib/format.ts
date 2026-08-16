// Currency + date formatting. The app is SGD-primary (its home market), so SGD
// / en-SG are the defaults and every existing call site keeps working with no
// argument. Pass a user's base currency + locale (from their profile) to render
// their money natively; a missing profile falls straight back to these.
export const DEFAULT_CURRENCY = "SGD";
export const DEFAULT_LOCALE = "en-SG";
export const DEFAULT_TIMEZONE = "Asia/Singapore";

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    // Unknown currency/locale code — never throw in a render path; fall back.
    return new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY }).format(amount);
  }
}

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Render a date in the reader's locale, drawing the calendar-date / instant
 * distinction that has now caused two shipped bugs.
 *
 *  • A bare `YYYY-MM-DD` is a CALENDAR DATE, not a moment. It is pinned to UTC
 *    on both the parse and the format, so no offset can shift it. Parsing it at
 *    local midnight and rendering it in another zone is what made a bill due
 *    28 Aug read as 27 Aug (see lib/manualBills.ts).
 *  • Anything else is a real instant and is rendered in the reader's timezone —
 *    a UTC `created_at` shown without one lands on the wrong day near midnight.
 *
 * Prefer `useMoney().formatDate` in components; it binds locale + timezone from
 * the profile so no call site has to remember either.
 */
export function formatDateIn(
  value: string | Date,
  locale: string = DEFAULT_LOCALE,
  timezone: string = DEFAULT_TIMEZONE,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  const calendarDate = typeof value === "string" && CALENDAR_DATE.test(value);
  const d = calendarDate ? new Date(`${value}T00:00:00Z`) : new Date(value);
  const timeZone = calendarDate ? "UTC" : timezone;
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, ...opts }).format(d);
  } catch {
    // Unknown locale/timezone — never throw in a render path.
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, { timeZone: "UTC", ...opts }).format(d);
  }
}

export function formatNumberIn(
  value: number,
  locale: string = DEFAULT_LOCALE,
  opts: Intl.NumberFormatOptions = {},
): string {
  try {
    return new Intl.NumberFormat(locale, opts).format(value);
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, opts).format(value);
  }
}

/**
 * Is this transaction's calendar date in the reader's current month?
 *
 * `today` is REQUIRED and must be the user's own calendar date (YYYY-MM-DD,
 * from their profile timezone). It used to default to the runtime clock, which
 * meant the server answered in UTC and the browser answered in the reader's
 * zone — so for eight hours either side of a month boundary the two disagreed
 * and "this month" totals changed on hydration.
 *
 * Both values are bare calendar dates, so comparing the YYYY-MM prefix needs no
 * Date object and no timezone at all.
 */
export function isCurrentMonth(date: string, today: string) {
  return date.slice(0, 7) === today.slice(0, 7);
}
