import type { TransactionType } from "@/lib/types";
import type { StatementRow } from "@/lib/csv/parseStatement";

/**
 * Extracts transaction lines from free-form statement TEXT — what you get out
 * of a bank e-statement PDF or an OCR'd screenshot, where the neat CSV columns
 * have collapsed into lines like "01 JUL GIRO PAYMENT HDB 1,072.70 2,127.42".
 *
 * Heuristic per line: a leading date + a trailing money amount = a
 * transaction. When two trailing amounts appear the last is treated as the
 * running balance (how every SG bank prints statements) and the one before it
 * is the transaction amount. Direction defaults to expense — statements are
 * overwhelmingly debits — unless the line carries a credit marker ("CR",
 * salary/deposit/refund/interest wording, PayNow FROM someone).
 * Everything still lands in review, so a wrong guess is visible and fixable.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const LEADING_DATE_RE = /^\s*(\d{1,2})[ /-]([A-Za-z]{3})[a-z]*(?:[ /-](\d{2,4}))?\b|^\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
const MONEY_RE = /\(?\d{1,3}(?:,\d{3})*\.\d{2}\)?(?:\s*(CR|DR))?/gi;
const CREDIT_WORDS = /\b(salary|payroll|bonus|interest|dividend|refund|reversal|rebate|cashback|deposit|credited?|cr)\b|\b(?:paynow|transfer|received?)\s+from\b/i;
// Lines that carry an amount but aren't transactions.
const NOISE_RE = /\b(balance\s+(brought|carried)\s+forward|opening balance|closing balance|total\s+(withdrawals?|deposits?|balance)|statement|page \d+|average daily)\b/i;

function toYear(raw: string | undefined, fallbackYear: number): number {
  if (!raw) return fallbackYear;
  const n = Number(raw);
  return n < 100 ? 2000 + n : n;
}

// The statement's own year, so date lines like "01 JUL" (no year — the DBS
// PDF style) resolve correctly even in January for a December statement.
function detectStatementYear(text: string): number {
  const m =
    text.match(/\b\d{1,2}[ /-][A-Za-z]{3}[a-z]*[ /-](\d{4})\b/) ??
    text.match(/\b[A-Za-z]{3,9}\s+(\d{4})\b/) ??
    text.match(/\b\d{1,2}\/\d{1,2}\/(\d{4})\b/);
  return m ? Number(m[1]) : new Date().getFullYear();
}

export function parseStatementText(text: string): { rows: StatementRow[]; skipped: number } {
  const fallbackYear = detectStatementYear(text);
  const rows: StatementRow[] = [];
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line || NOISE_RE.test(line)) continue;

    const dateMatch = line.match(LEADING_DATE_RE);
    if (!dateMatch) continue;

    let iso: string | null = null;
    if (dateMatch[1] && dateMatch[2]) {
      const month = MONTHS[dateMatch[2].toLowerCase()];
      if (!month) continue;
      const year = toYear(dateMatch[3], fallbackYear);
      iso = `${year}-${String(month).padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
    } else if (dateMatch[4] && dateMatch[5] && dateMatch[6]) {
      const day = Number(dateMatch[4]);
      const month = Number(dateMatch[5]);
      if (month < 1 || month > 12 || day < 1 || day > 31) continue;
      iso = `${toYear(dateMatch[6], fallbackYear)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    if (!iso) continue;

    const amounts = [...line.matchAll(MONEY_RE)];
    if (amounts.length === 0) {
      skipped++;
      continue;
    }

    // Last trailing number is the running balance when 2+ appear.
    const chosen = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
    const amount = parseFloat(chosen[0].replace(/[(),]/g, "").replace(/\s*(CR|DR)$/i, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      skipped++;
      continue;
    }

    const description = line
      .slice(dateMatch[0].length, chosen.index)
      .replace(/\s+/g, " ")
      .trim();
    // A description with no real words is layout debris, not a merchant —
    // e.g. a credit-card header line "14 Jun 2026 $2,000.00 $120.16" would
    // otherwise import the credit limit as a $2,000 transaction.
    if (!/[A-Za-z]{2}/.test(description)) {
      skipped++;
      continue;
    }

    const creditMarked = /CR$/i.test(chosen[0].trim()) || CREDIT_WORDS.test(description);
    const type: TransactionType = creditMarked ? "income" : "expense";

    rows.push({ date: iso, description: description.slice(0, 160), amount, type });
  }

  return { rows, skipped };
}
