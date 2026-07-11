import { CURRENCY_PATTERN, CURRENCY_TOKEN_TO_ISO, type ParsedCandidate } from "@/lib/email/parseCandidate";
import { suggestCategory } from "@/lib/tagger";

/**
 * Rule-based parser for SG bank transaction SMS — the wording differs from
 * email alerts ("Your card ending 3059 was used for SGD5.96 at ...") so the
 * email heuristic misses them. Same philosophy: an amount plus transaction
 * wording, or it isn't a capture; OTPs and marketing never get through.
 */

// A transaction SMS says money moved. OTPs, logins and promos don't.
const SMS_TRANSACTION_RE =
  /\b(spent|charged|used for|paid|payment|purchase|transaction|debited|withdrawn|transfer(?:red)?|received|credited)\b/i;

// Never treat security messages as money — even if they mention amounts.
const SMS_IGNORE_RE =
  /\b(otp|one[- ]?time (?:password|pin|code)|verification code|do not share|login|log ?in|sign ?in|approve this|security alert|promo(?:tion)?|voucher|redeem)\b/i;

const SMS_INCOME_RE = /\b(received|credited|refund(?:ed)?|deposited|salary)\b/i;

const AMOUNT_RE = new RegExp(`${CURRENCY_PATTERN}\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)`);

// "... at UNITY BY FAIRPRICE on 06/12" → merchant between "at" and the
// date or punctuation. Falls back to "to <name>" for transfers.
const MERCHANT_AT_RE = /\bat\s+([^.,\n]+?)(?=\s+on\s+\d|\s+via\s|[.,\n]|$)/i;
const MERCHANT_TO_RE = /\bto\s+([^.,\n]+?)(?=\s+on\s+\d|\s+via\s|[.,\n]|$)/i;

const CARD_TAG_RE = /(?:card|a\/c|acct|account)(?:\s*(?:no\.?|number))?\D{0,10}(\d{4})/i;

export function suggestSmsAccountTag(from: string, body: string): string | null {
  const combined = `${from} ${body}`.toLowerCase();
  if (combined.includes("paylah")) return "PayLah";
  if (combined.includes("trust")) return "Trust";
  const card = body.match(CARD_TAG_RE);
  if (card) return `Card ${card[1]}`;
  if (combined.includes("posb")) return "POSB";
  if (combined.includes("dbs")) return "DBS";
  if (combined.includes("uob")) return "UOB";
  if (combined.includes("ocbc")) return "OCBC";
  return null;
}

/** Returns a candidate or null — null means "not a transaction SMS", which the caller ignores silently. */
export function parseSmsTransaction(body: string): ParsedCandidate | null {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text || SMS_IGNORE_RE.test(text)) return null;
  if (!SMS_TRANSACTION_RE.test(text)) return null;

  const match = text.match(AMOUNT_RE);
  if (!match) return null;
  const amount = parseFloat(match[2].replace(/,/g, ""));
  if (!amount || amount <= 0) return null;
  const currency = (match[1] && CURRENCY_TOKEN_TO_ISO[match[1]]) || "SGD";

  const type = SMS_INCOME_RE.test(text) ? ("income" as const) : ("expense" as const);

  const merchant =
    text.match(MERCHANT_AT_RE)?.[1]?.trim() ?? text.match(MERCHANT_TO_RE)?.[1]?.trim() ?? null;

  const suggestion = suggestCategory(merchant ?? text, type);

  return {
    amount,
    currency,
    type,
    category: suggestion?.category ?? null,
    note: (merchant ?? text).slice(0, 120),
  };
}
