import { resolveMerchant } from "@/lib/merchants";

/**
 * Receipt parser (rules, no LLM): turns the OCR text of a single receipt into a
 * prefill for the add-transaction form — the total amount, the merchant, and a
 * date if one is printed. Deliberately conservative: it prefers an amount that
 * sits next to a "total" label, and only falls back to the largest figure.
 */

export type ReceiptParse = {
  amount: number | null;
  merchant: string | null;
  date: string | null; // yyyy-mm-dd
};

const AMOUNT = "([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{2}))";
// The label and its amount sit on the same line — often far apart because the
// amount is right-aligned — so allow a wide same-line gap but never cross a
// newline (which would grab a number from a different row).
const TOTAL_LABELS: { re: RegExp; priority: number }[] = [
  { re: new RegExp(`\\b(?:grand\\s*total|total\\s*due|amount\\s*due|balance\\s*due|amount\\s*payable)\\b[^0-9\\n]{0,40}${AMOUNT}`, "i"), priority: 3 },
  { re: new RegExp(`\\b(?:nett?\\s*total|total)\\b[^0-9\\n]{0,40}${AMOUNT}`, "i"), priority: 2 },
];
const ANY_AMOUNT = new RegExp(AMOUNT, "g");
const SUBTOTAL_NEAR = /\b(sub\s*total|subtotal|change|cash|tender|tax|gst|svc|service)\b/i;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function toNum(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function parseAmount(text: string): number | null {
  // 1) label-anchored totals, best priority first
  let best: { amount: number; priority: number } | null = null;
  for (const { re, priority } of TOTAL_LABELS) {
    // scan all matches of this label kind
    const global = new RegExp(re.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = global.exec(text)) !== null) {
      // skip lines that are clearly subtotal/change/tax context
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      const line = text.slice(lineStart, m.index + m[0].length);
      if (SUBTOTAL_NEAR.test(line)) continue;
      const amount = toNum(m[1]);
      if (!best || priority > best.priority || (priority === best.priority && amount > best.amount)) {
        best = { amount, priority };
      }
    }
  }
  if (best) return best.amount;

  // 2) fallback: the largest 2-decimal figure on the receipt
  const all = [...text.matchAll(ANY_AMOUNT)].map((m) => toNum(m[1])).filter((n) => n > 0);
  if (all.length === 0) return null;
  return Math.max(...all);
}

function parseMerchant(text: string): string | null {
  const known = resolveMerchant(text);
  if (known) return known.name;
  // otherwise the first line with at least two letters (store name is up top)
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (/[A-Za-z]{2,}/.test(line) && line.length >= 3 && line.length <= 40) {
      return line;
    }
  }
  return null;
}

function clampDate(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const year = y < 100 ? 2000 + y : y;
  if (year < 2000 || year > 2100) return null;
  return `${year}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDate(text: string): string | null {
  // dd/mm/yyyy or dd-mm-yyyy (SG order) — also handles 2-digit years
  for (const m of text.matchAll(/\b([0-3]?\d)[/\-.]([01]?\d)[/\-.](\d{4}|\d{2})\b/g)) {
    const d = clampDate(Number(m[3]), Number(m[2]), Number(m[1]));
    if (d) return d;
  }
  // yyyy-mm-dd
  for (const m of text.matchAll(/\b(\d{4})[/\-.]([01]?\d)[/\-.]([0-3]?\d)\b/g)) {
    const d = clampDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if (d) return d;
  }
  // dd Mon yyyy — iterate so a false "CASH"/"CHANGE" hit doesn't stop the real one
  for (const m of text.matchAll(/\b([0-3]?\d)\s*([A-Za-z]{3,})\.?\s*(\d{4}|\d{2})\b/g)) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (!mo) continue;
    const d = clampDate(Number(m[3]), mo, Number(m[1]));
    if (d) return d;
  }
  return null;
}

export function parseReceipt(text: string): ReceiptParse {
  const normalized = text.replace(/ /g, " ");
  return {
    amount: parseAmount(normalized),
    merchant: parseMerchant(normalized),
    date: parseDate(normalized),
  };
}
