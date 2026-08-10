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

export type GmailConfirmation = {
  /** The numeric code to paste into Gmail. Null when it can't be read. */
  code: string | null;
  /** Google's one-click verification link — confirms without any code. */
  url: string | null;
};

/**
 * Google's Gmail-forwarding confirmation, which arrives at the destination
 * address rather than the user's own inbox.
 *
 * RECOGNITION is deliberately broader than EXTRACTION, because the two have
 * opposite failure costs. Failing to recognise means the message is parsed as
 * an ordinary transaction and lost, leaving someone at a Gmail screen that can
 * never be satisfied and no trace of why. Failing to extract, once recognised,
 * just means we hand back less. So: recognise on sender OR subject, then take
 * whatever we can get.
 *
 * The link is the primary result, not the code. It confirms in one click,
 * it needs no copy-paste, and — the reason it exists here — it does not depend
 * on Google's wording. Every code heuristic below is a guess about phrasing
 * that Google is free to change: the first version looked for "(#123456789)"
 * in the subject, which is where Google used to put it and no longer does,
 * and the whole feature silently stopped working. A URL is structural.
 */
export function extractGmailConfirmation(
  from: string,
  subject: string,
  body: string,
): GmailConfirmation | null {
  const looksLikeGoogle =
    from.toLowerCase().includes("forwarding-noreply@google.com") ||
    /forwarding\s+confirmation/i.test(subject);
  if (!looksLikeGoogle) return null;

  // Google's verification link. Trailing punctuation is trimmed because mail
  // clients wrap URLs in brackets or end the sentence right after them.
  const urlMatch = body.match(/https:\/\/mail\.google\.com\/mail\/[^\s"'<>()[\]]+/i);
  const url = urlMatch ? urlMatch[0].replace(/[.,;:]+$/, "") : null;

  const code =
    // Where Google used to put it. Kept because it costs nothing and older
    // or regional variants may still use it.
    subject.match(/\(#\s*(\d{6,12})\s*\)/)?.[1] ??
    // The labelled form, in the languages this is likely to arrive in.
    body.match(/(?:confirmation|verification|bestätigungs|confirmación|確認)[^\d]{0,40}(\d{6,12})/i)?.[1] ??
    // Last resort: a bare number of the right shape, once we already know this
    // is a Google confirmation. Excluded from anything glued to a URL or a
    // longer token by requiring whitespace or line ends on both sides.
    body.match(/(?:^|\s)(\d{6,12})(?=\s|$)/m)?.[1] ??
    null;

  // Recognised but empty-handed: still report it, so the caller treats it as
  // setup mail rather than parsing it for a transaction it will never contain.
  return { code, url };
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
