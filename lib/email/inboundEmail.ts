/**
 * Pure helpers for the inbound-forwarding webhook.
 *
 * Separate from the route so they can be tested against real payload shapes
 * without booting Next. That is not a stylistic preference: the first version
 * kept these inside the handler, a header-shape assumption was wrong, and
 * Google's forwarding confirmation was silently consumed as ordinary mail —
 * a failure no test could reach and no log recorded.
 */

/** The "+tag" of abc123+u_TOKEN@cloudmailin.net, lowercased. */
export function tokenFromRecipient(recipient: string): string {
  if (typeof recipient !== "string") return "";
  const address = recipient.match(/<([^<>]+)>/)?.[1] ?? recipient;
  const local = address.split("@")[0] ?? "";
  const plus = local.indexOf("+");
  if (plus === -1) return "";
  // Lowercased on the way in and on the way out: mail systems are entitled to
  // case-fold the local part, so a token that only matched in its original
  // case would fail intermittently and look like a flaky feature.
  return local.slice(plus + 1).trim().toLowerCase();
}

/**
 * Google's Gmail-forwarding confirmation, which arrives at the destination
 * address rather than the user's own inbox.
 *
 * Two independent triggers, because relying on the sender alone already failed
 * once: if the From header can't be read for any reason, the code is consumed
 * as an ordinary message and lost, and the person is left staring at a Gmail
 * screen that will never verify. The subject is Google's own and specific
 * enough to stand alone.
 *
 * A code must still be extracted for this to count, so a message that merely
 * looks like a confirmation is treated as ordinary mail rather than swallowed.
 */
export function extractGmailConfirmation(
  from: string,
  subject: string,
  body: string,
): string | null {
  const looksLikeGoogle =
    from.toLowerCase().includes("forwarding-noreply@google.com") ||
    /forwarding\s+confirmation/i.test(subject);
  if (!looksLikeGoogle) return null;
  const fromSubject = subject.match(/\(#\s*(\d{6,12})\s*\)/);
  if (fromSubject) return fromSubject[1];
  const fromBody = body.match(/confirmation code[^\d]{0,40}(\d{6,12})/i);
  return fromBody ? fromBody[1] : null;
}

/**
 * Header lookup that doesn't care which shape the provider sends.
 *
 * CloudMailin has several payload formats and they disagree about header keys —
 * `From` vs `from`, `Message-ID` vs `message_id` — and repeated headers arrive
 * as arrays. Reading `payload.headers.from` directly worked in exactly one of
 * those formats and produced empty strings in the others, with no error: that
 * is how the first real confirmation email was lost. No From meant no sender
 * match, so it was parsed as a transaction, matched nothing, and disappeared.
 *
 * Normalising each key to lowercase alphanumerics makes every spelling resolve
 * to the same entry, so the route no longer depends on which format an account
 * happens to be configured for.
 */
export function headerIndex(headers: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (!headers || typeof headers !== "object") return out;
  for (const [rawKey, rawValue] of Object.entries(headers as Record<string, unknown>)) {
    const key = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    const value = Array.isArray(rawValue)
      ? rawValue.map((v) => (typeof v === "string" ? v : "")).filter(Boolean).join(" ")
      : typeof rawValue === "string"
        ? rawValue
        : "";
    if (value && !out.has(key)) out.set(key, value);
  }
  return out;
}
