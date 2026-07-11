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

// Common currency symbols/codes — not just USD/$, so receipts and bank
// alerts in other currencies (SGD, MYR, EUR, GBP, THB, ...) are still picked
// up. The token is captured so foreign amounts can be converted to SGD.
const CURRENCY =
  "(USD|US\\$|SGD|S\\$|MYR|RM|EUR|GBP|INR|AUD|CAD|JPY|CNY|HKD|THB|\\$|€|£|¥|₹|฿)";
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

// Symbol/token → ISO code. A bare "$" is treated as SGD: this is an
// SGD-primary app for the Singapore market, and local receipts (AXS, hawker
// POS, telco bills) write plain "$" meaning Singapore dollars.
const CURRENCY_TOKEN_TO_ISO: Record<string, string> = {
  "USD": "USD", "US$": "USD",
  "SGD": "SGD", "S$": "SGD", "$": "SGD",
  "MYR": "MYR", "RM": "MYR",
  "EUR": "EUR", "€": "EUR",
  "GBP": "GBP", "£": "GBP",
  "INR": "INR", "₹": "INR",
  "AUD": "AUD", "CAD": "CAD",
  "JPY": "JPY", "¥": "JPY",
  "CNY": "CNY", "HKD": "HKD",
  "THB": "THB", "฿": "THB",
};

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
  // ISO code of the currency the amount was written in — SGD for local
  // receipts; the caller converts anything else before it can enter the ledger.
  currency: string;
  type: TransactionType;
  category: string | null;
  note: string;
};

function normalizeWhitespace(text: string): string {
  return text.replace(EXOTIC_WHITESPACE_RE, " ");
}

/** Rule-based (no LLM) heuristic — same "no external API" approach as lib/tagger.ts. */
export function parseEmailForTransaction(subject: string, bodyText: string): ParsedCandidate | null {
  if (PROMOTIONAL_SUBJECT_RE.test(subject)) return null;

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

  const currency = (match[1] && CURRENCY_TOKEN_TO_ISO[match[1]]) || "SGD";

  const type: TransactionType = INCOME_KEYWORDS.test(combined) ? "income" : "expense";
  // Category keywords (merchant names, etc.) often live in the body rather
  // than the subject line — e.g. "GRAB*RIDE" or "STARBUCKS SG" in a bank
  // debit alert whose subject is just "You have a new transaction".
  const suggestion = suggestCategory(combined, type);

  return {
    amount,
    currency,
    type,
    category: suggestion?.category ?? null,
    note: subject.trim().slice(0, 120) || "Email transaction",
  };
}
