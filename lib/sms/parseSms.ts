import {
  CURRENCY_PATTERN,
  isSelfReferential,
  resolveCurrencyToken,
  resolveDirection,
  type ParsedCandidate,
} from "@/lib/email/parseCandidate";
import { suggestCategory } from "@/lib/tagger";

/**
 * Rule-based parser for bank transaction SMS — the wording differs from email
 * alerts ("Your card ending 3059 was used for SGD5.96 at ...") so the email
 * heuristic misses them. Same philosophy: an amount plus transaction wording,
 * or it isn't a capture; OTPs and marketing never get through.
 */

// A transaction SMS says money moved. OTPs, logins and promos don't.
const SMS_TRANSACTION_RE =
  /\b(spent|charged|used for|paid|payment|purchase|transaction|debited|withdrawn|transfer(?:red)?|received|credited)\b/i;

// Never treat security messages as money — even if they mention amounts.
const SMS_IGNORE_RE =
  /\b(otp|one[- ]?time (?:password|pin|code)|verification code|do not share|login|log ?in|sign ?in|approve this|security alert|promo(?:tion)?|voucher|redeem)\b/i;

// The regulator-mandated advertising prefix. Marketing SMS in Singapore and
// Malaysia must carry "<ADV>", which makes it a declaration rather than a
// guess — see the same filter in parseCandidate, added after an advert was
// auto-posted as a $100 expense.
const SMS_ADVERTISEMENT_RE = /(?:^|\s)[<[(]\s*ad(?:v|vert|vertisement)?\s*[>\])]/i;

const SMS_INCOME_RE = /\b(received|credited|refund(?:ed)?|deposited|salary)\b/i;

const AMOUNT_RE = new RegExp(`${CURRENCY_PATTERN}\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2})?)`);

// "... at UNITY BY FAIRPRICE on 06/12" → merchant between "at" and the
// date or punctuation. Falls back to "to <name>" for transfers.
const MERCHANT_AT_RE = /\bat\s+([^.,\n]+?)(?=\s+on\s+\d|\s+via\s|[.,\n]|$)/i;
const MERCHANT_TO_RE = /\bto\s+([^.,\n]+?)(?=\s+on\s+\d|\s+via\s|[.,\n]|$)/i;

const CARD_TAG_RE = /(?:card|a\/c|acct|account)(?:\s*(?:no\.?|number))?\D{0,10}(\d{4})/i;

/**
 * Best-effort account label. The named banks are a recognition bonus for the
 * home market, not a requirement — the card-digit fallback works for any bank
 * anywhere, and a null just means the capture carries no account tag.
 */
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

/**
 * Returns a candidate or null — null means "not a transaction SMS", which the
 * caller ignores silently. `defaultCurrency` is the user's own base currency,
 * used for amounts the SMS wrote without a currency marker.
 */
export function parseSmsTransaction(
  body: string,
  defaultCurrency: string,
): ParsedCandidate | null {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text || SMS_IGNORE_RE.test(text)) return null;
  if (SMS_ADVERTISEMENT_RE.test(text)) return null;
  if (!SMS_TRANSACTION_RE.test(text)) return null;

  const match = text.match(AMOUNT_RE);
  if (!match) return null;
  const amount = parseFloat(match[2].replace(/,/g, ""));
  if (!amount || amount <= 0) return null;
  const currency = resolveCurrencyToken(match[1], defaultCurrency);

  // Shared with the email parser. Bank SMS and bank email describe the same
  // event in the same grammar, and keeping two lists is how one of them ended
  // up reading "we have received" as income while the other read "you've
  // received a transfer" as an expense.
  const { type, confident: typeConfident } = resolveDirection(text);

  // "credited to your account" fits MERCHANT_TO_RE perfectly and names nobody.
  // Accepting it as the merchant replaced the sentence that held the real
  // signal, so a salary SMS categorised on the words "your account" and came
  // back with nothing.
  const rawMerchant =
    text.match(MERCHANT_AT_RE)?.[1]?.trim() ?? text.match(MERCHANT_TO_RE)?.[1]?.trim() ?? null;
  const merchant = rawMerchant && !isSelfReferential(rawMerchant) ? rawMerchant : null;

  const suggestion = suggestCategory(merchant ?? text, type);

  return {
    amount,
    currency,
    type,
    typeConfident,
    category: suggestion?.category ?? null,
    note: (merchant ?? text).slice(0, 120),
  };
}
