// Currency + date formatting. The app is SGD-primary (its home market), so SGD
// / en-SG are the defaults and every existing call site keeps working with no
// argument. Pass a user's base currency + locale (from their profile) to render
// their money natively; a missing profile falls straight back to these.
export const DEFAULT_CURRENCY = "SGD";
export const DEFAULT_LOCALE = "en-SG";

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

export function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isCurrentMonth(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
