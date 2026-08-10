import {
  CURRENCY_PATTERN,
  isSelfReferential,
  resolveCurrencyToken,
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

/**
 * Who the money moved TO. This is the sign of the transaction, and getting it
 * wrong is the most expensive mistake this file can make: a S$484.07 premium
 * booked as income instead of an expense moves the ledger by S$968.14.
 *
 * The old rule tested for the verb alone, which reads the wrong subject.
 * Manulife writes "We have received PayNow Collection amount of S$484.07 for
 * insurance policy" — THEY received it, so the reader paid. It was matched as
 * income, auto-posted because the sender was trusted, and had to be corrected
 * by hand. The very next message from the same sender, "we have credited your
 * payout of SGD 409.10 into your account", genuinely is income. Same verb
 * family, opposite direction: only the subject distinguishes them.
 */
// A biller telling you what THEY did with your money — you are the payer.
const SMS_OUTBOUND_RE =
  /\b(?:we|they)\s+(?:have\s+|has\s+|had\s+)?(?:received|collected|debited|deducted|charged)\b|\bdeducted from your\b|\bdebited from your\b|\bpayment to\b|\bpaid to\b/i;

// Money arriving in YOUR account — the subject is you, or your account.
const SMS_INBOUND_RE =
  /\b(?:you|you'?ve)\s+(?:have\s+)?received\b|\bcredited (?:to|into) your\b|\bdeposited (?:to|into) your\b|\byour (?:payout|refund|salary)\b|\binto your account\b/i;

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

  // Direction, most specific evidence first. An explicit statement about whose
  // account moved always beats a bare verb.
  const inbound = SMS_INBOUND_RE.test(text);
  const outbound = SMS_OUTBOUND_RE.test(text);
  const incomeVerb = SMS_INCOME_RE.test(text);

  let type: "income" | "expense";
  let typeConfident: boolean;
  if (outbound && !inbound) {
    type = "expense";
    typeConfident = true;
  } else if (inbound && !outbound) {
    type = "income";
    typeConfident = true;
  } else if (incomeVerb) {
    // An income-ish verb with no statement of direction, or contradictory
    // statements. Spending is the commoner case so that stays the guess, but
    // the guess is flagged and the capture goes to review rather than being
    // posted on the strength of it.
    type = "expense";
    typeConfident = false;
  } else {
    // No income wording at all — an ordinary card debit.
    type = "expense";
    typeConfident = true;
  }

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
