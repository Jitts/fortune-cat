/**
 * Best-effort account tag from an email's sender + body — a filter label
 * (tag-only accounts: no per-account balance math), so "was that on the Trust
 * card or PayLah?" is answerable at a glance in the feed.
 */
export function suggestAccountTag(from: string, text: string): string | null {
  const f = from.toLowerCase();
  if (f.includes("paylah")) return "PayLah";
  if (f.includes("dbs.com")) return /\bPOSB\b/i.test(text) ? "POSB" : "DBS";
  if (f.includes("trustbank")) return "Trust";
  if (f.includes("stripe.com")) return "Card";
  if (f.includes("axs.com")) return "AXS";
  const acct = text.match(/A\/C ending (\d{4})/i);
  if (acct) return `A/C ${acct[1]}`;
  return null;
}
