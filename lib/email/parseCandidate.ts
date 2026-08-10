import { suggestCategory } from "@/lib/tagger";
import type { TransactionType } from "@/lib/types";

// Requires at least one of these AND a matched amount before treating an
// email as a transaction candidate — keeps ordinary newsletters/notifications
// out even though they might mention a dollar figure in passing.
const TRANSACTION_KEYWORDS =
  /\b(receipt|order|invoice|payment|transaction|charged|purchase|statement|confirmation|paid|refund|deposit|payroll|bill|reference\s*(?:no\.?|number|#)?|txn|authoriz(?:ation|ed)|approval|debited|credited)\b/i;

const INCOME_KEYWORDS = /\b(refund|deposit|payroll|payment received|direct deposit|credited)\b/i;

// Promotional voucher/redemption emails (e.g. a bank's "Redeem your S$80 Esso
// Fuel Discount Vouchers" campaign) often mention "payment" in their T&Cs and
// repeat a dollar figure that is a voucher face value, not a real charge —
// which would otherwise false-positive as a transaction. Scoped to the
// subject line only (not the body) so a real receipt that happens to mention
// a voucher discount applied at checkout still gets through.
const PROMOTIONAL_SUBJECT_RE = /\b(redemption|redeem)\b[^\n]*\bvoucher/i;

/**
 * The regulator-mandated advertising prefix — "<ADV>" and its bracket variants.
 *
 * Singapore and Malaysia both require marketing messages to carry it, so it is
 * the rare filter that is a declaration rather than a guess: the sender is
 * stating, under a rule they can be penalised for breaking, that this is an
 * advertisement. Nothing carrying it is a transaction.
 *
 * This is not hypothetical tidying. "<ADV> Don't let inflation erode your
 * savings!" was parsed as a $100 expense and auto-posted into a real ledger,
 * because the sender happened to be trusted and the body mentioned a figure.
 * A second one, "<ADV> How can we improve your community?", was read as $500
 * and only escaped because its sender wasn't trusted yet.
 *
 * Deliberately narrow. Topic words like "offer", "sale" or "unsubscribe"
 * appear in genuine receipts all the time and would cost real captures; the
 * prefix appears in nothing else.
 */
const ADVERTISEMENT_PREFIX_RE = /(?:^|\s)[<[(]\s*ad(?:v|vert|vertisement)?\s*[>\])]/i;

// Common currency symbols/codes — not just USD/$, so receipts and bank
// alerts in other currencies (SGD, MYR, EUR, GBP, THB, ...) are still picked
// up. The token is captured so foreign amounts can be converted to the
// reader's own base currency.
// Exported for the SMS parser, which shares the same money grammar.
export const CURRENCY_PATTERN =
  "(USD|US\\$|SGD|S\\$|MYR|RM|EUR|GBP|INR|AUD|CAD|JPY|CNY|HKD|THB|\\$|€|£|¥|₹|฿)";
const CURRENCY = CURRENCY_PATTERN;
// \s* (not \s?) between currency and amount — bank templates render these in
// separate table cells, so HTML-to-text conversion often leaves multiple
// spaces, tabs, or even a line break between "SGD" and the number.
const AMOUNT_WITH_CURRENCY_RE = new RegExp(
  `${CURRENCY}\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)`,
);
// Fallback for amounts with no currency marker at all, e.g. "Total: 42.99" —
// anchored to a money-ish label so it doesn't match arbitrary numbers.
const AMOUNT_WITH_LABEL_RE = new RegExp(
  `\\b(?:total|amount|sum|charged|paid|debited|credited)\\b\\s*:?\\s*${CURRENCY}?\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)`,
  "i",
);

// Symbol/token → ISO code. A bare "$" is deliberately ABSENT here: eight of
// the currencies this app supports write it (USD, SGD, AUD, CAD, NZD, HKD,
// TWD, MXN), so the character alone cannot settle it. resolveCurrencyToken()
// resolves it against the reader's own currency instead.
export const CURRENCY_TOKEN_TO_ISO: Record<string, string> = {
  "USD": "USD", "US$": "USD",
  "SGD": "SGD", "S$": "SGD",
  "MYR": "MYR", "RM": "MYR",
  "EUR": "EUR", "€": "EUR",
  "GBP": "GBP", "£": "GBP",
  "INR": "INR", "₹": "INR",
  "AUD": "AUD", "CAD": "CAD",
  "JPY": "JPY", "¥": "JPY",
  "CNY": "CNY", "HKD": "HKD",
  "THB": "THB", "฿": "THB",
};

// Currencies whose everyday written form is a bare "$".
const DOLLAR_CURRENCIES = new Set(["USD", "SGD", "AUD", "CAD", "NZD", "HKD", "TWD", "MXN"]);

/**
 * Resolve a matched currency token to an ISO code.
 *
 * `defaultCurrency` is the reader's own base currency and it settles the two
 * ambiguous cases: no token at all ("Total: 42.99"), and a bare "$". This is
 * not cosmetic — the amount is FX-converted on the way into the ledger, so a
 * US user's "$45.20" booked as SGD lands at roughly a third of what they
 * actually spent.
 */
export function resolveCurrencyToken(
  token: string | undefined,
  defaultCurrency: string,
): string {
  if (!token) return defaultCurrency;
  const iso = CURRENCY_TOKEN_TO_ISO[token];
  if (iso) return iso;
  // A bare "$" means the reader's own dollar when they have one. Someone
  // banking in EUR who sees a "$" amount is genuinely looking at USD.
  if (token === "$") return DOLLAR_CURRENCIES.has(defaultCurrency) ? defaultCurrency : "USD";
  return defaultCurrency;
}

// Non-breaking space, zero-width space/joiner/BOM, and other exotic Unicode
// whitespace that HTML-table-to-text conversion of bank email templates
// commonly leaves behind (e.g. an &nbsp; between a label and its value).
// Collapsed to a plain space so the regexes above see contiguous text
// instead of being split by a character \s doesn't recognize.
const EXOTIC_WHITESPACE_CODES = [0x00a0, 0x200b, 0x200c, 0x200d, 0x2060, 0x3000, 0xfeff];
const EXOTIC_WHITESPACE_RE = new RegExp(
  `[${EXOTIC_WHITESPACE_CODES.map((c) => `\\u${c.toString(16).padStart(4, "0")}`).join("")}]`,
  "g",
);

export type ParsedCandidate = {
  amount: number;
  // ISO code of the currency the amount was written in. Anything other than
  // the reader's base currency is converted before it can enter the ledger.
  currency: string;
  type: TransactionType;
  /**
   * False when income-or-expense was a guess rather than a reading.
   *
   * Optional, and absent means confident — a statement import states its own
   * sign, so those paths have nothing to declare. The parsers that infer
   * direction from prose set it explicitly.
   *
   * processFetchedEmails routes an unconfident capture to review instead of
   * auto-posting it, on the same principle already applied to foreign
   * currency: a guessed rate never silently enters the ledger, and neither
   * should a guessed direction. Getting the sign wrong is the costliest error
   * here — a mis-signed amount moves the balance by twice its value.
   */
  typeConfident?: boolean;
  category: string | null;
  note: string;
};

function normalizeWhitespace(text: string): string {
  return text.replace(EXOTIC_WHITESPACE_RE, " ");
}

/**
 * Rule-based (no LLM) heuristic — same "no external API" approach as lib/tagger.ts.
 *
 * `defaultCurrency` is required rather than defaulted: a silent fallback is
 * exactly what booked every unmarked amount as SGD regardless of who the user
 * was, so the type now forces each call site to say whose money this is.
 */
export function parseEmailForTransaction(
  subject: string,
  bodyText: string,
  defaultCurrency: string,
): ParsedCandidate | null {
  if (PROMOTIONAL_SUBJECT_RE.test(subject)) return null;
  if (ADVERTISEMENT_PREFIX_RE.test(subject)) return null;

  const combined = normalizeWhitespace(`${subject}\n${bodyText}`);
  if (!TRANSACTION_KEYWORDS.test(combined)) return null;

  // Labeled amount first: itemized receipts (e.g. a multi-night hotel stay
  // with a per-night rate on every line) contain several currency-tagged
  // numbers, and only the one next to "Total"/"Amount paid"/etc. is the real
  // charge — the bare currency match would otherwise grab the first line item.
  const match = combined.match(AMOUNT_WITH_LABEL_RE) ?? combined.match(AMOUNT_WITH_CURRENCY_RE);
  if (!match) return null;

  const amount = parseFloat(match[2].replace(/,/g, ""));
  if (!amount || amount <= 0) return null;

  const currency = resolveCurrencyToken(match[1], defaultCurrency);

  const type: TransactionType = INCOME_KEYWORDS.test(combined) ? "income" : "expense";

  // Categorise on the payee, not on the whole email.
  //
  // This used to pass `combined` — subject plus the entire body — to the
  // keyword tagger, on the reasoning that merchant names live in the body. The
  // merchant does, but so does everything else: a bank alert is a few lines of
  // transaction wrapped in image alt text, disclaimers and marketing. A real
  // PayLah alert paying a food stall categorised as Transport, because the
  // promotional footer said "grab a ride" and beat the one word that mattered.
  // The signal is a dozen characters; the noise is several hundred words, and
  // majority-vote keyword matching hands the decision to the noise every time.
  const payee = extractPayee(combined);
  const suggestion = suggestCategory(payee ?? subject, type);

  return {
    amount,
    currency,
    type,
    category: suggestion?.category ?? null,
    note: subject.trim().slice(0, 120) || "Email transaction",
  };
}

// Where bank alerts name the other party. Ordered most-specific first; each
// stops at a date, a preposition that starts a new clause, or punctuation, so
// a match can't swallow the rest of the sentence.
const PAYEE_PATTERNS: RegExp[] = [
  // A bounded lazy gap rather than a guess at the amount's shape: alerts write
  // "payment of SGD 2.00 to X", "payment of 2.00 to X" and "paid to X", and a
  // pattern that assumed one token between "of" and "to" matched none of the
  // first kind. Capped and newline/period-free so it can't cross clauses.
  // `(?:[^.\n]|\.\d)` — a period is allowed only inside a number. That lets
  // the gap span "of SGD 2.00 to" while still refusing to cross a sentence
  // boundary, which a plain `[^.\n]` could not do and a plain `[^\n]` would
  // have done too freely.
  /\b(?:paid|payment|transfer(?:red)?)\b(?:[^.\n]|\.\d){0,40}?\bto\s+([^.,;\n]{2,60}?)(?=\s+on\s|\s+via\s|\s+for\s|[.,;\n]|$)/i,
  /\b(?:at|to)\s+merchant\s+([^.,;\n]{2,60}?)(?=\s+on\s|[.,;\n]|$)/i,
  /\bmerchant\s*(?:name)?\s*[:\-]\s*([^.,;\n]{2,60})/i,
  /\b(?:payee|recipient|beneficiary)\s*[:\-]\s*([^.,;\n]{2,60})/i,
  /\bwas\s+used\s+(?:for\s+[^\s]+\s+)?at\s+([^.,;\n]{2,60}?)(?=\s+on\s|[.,;\n]|$)/i,
  /\bat\s+([^.,;\n]{2,60}?)(?=\s+on\s+\d|[.,;\n]|$)/i,
];

/**
 * The other party to the transaction, or null when the alert doesn't name one.
 *
 * Null is a useful answer: it sends categorisation back to the subject line,
 * which is short and topical. Guessing from the body is what produced the
 * wrong answers this function exists to prevent.
 */
export function extractPayee(text: string): string | null {
  for (const pattern of PAYEE_PATTERNS) {
    const found = text.match(pattern)?.[1]?.trim();
    if (!found || found.length < 2) continue;
    // A "payee" that is mostly digits is a reference number, not a name.
    if (/^\W*\d[\d\s\-/]*$/.test(found)) continue;
    if (isSelfReferential(found)) continue;
    return found;
  }
  return null;
}

/**
 * "credited to your account" names no merchant — it names the reader.
 *
 * Worth its own check because the phrase sits in exactly the position a payee
 * occupies, so a "to X" pattern captures it happily. Taking "your account" as
 * the merchant then replaces the text that carried the real signal: a salary
 * SMS categorised on "your account" matches nothing and comes back
 * uncategorised, when the word "salary" was right there in the sentence.
 */
export function isSelfReferential(name: string): boolean {
  return /^(?:your|my|the)?\s*(?:own\s+)?(?:account|acct|a\/c|card|wallet|balance|self|you)\b/i.test(
    name.trim(),
  );
}
