import { suggestCategory } from "@/lib/tagger";
import type { TransactionType } from "@/lib/types";

// Requires at least one of these AND a matched amount before treating an
// email as a transaction candidate — keeps ordinary newsletters/notifications
// out even though they might mention a dollar figure in passing.
const TRANSACTION_KEYWORDS =
  /\b(receipt|order|invoice|payment|transaction|charged|purchase|statement|confirmation|paid|refund|deposit|payroll|bill)\b/i;

const INCOME_KEYWORDS = /\b(refund|deposit|payroll|payment received|direct deposit)\b/i;

const AMOUNT_RE = /(?:USD|US\$|\$)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/;

export type ParsedCandidate = {
  amount: number;
  type: TransactionType;
  category: string | null;
  note: string;
};

/** Rule-based (no LLM) heuristic — same "no external API" approach as lib/tagger.ts. */
export function parseEmailForTransaction(subject: string, bodyText: string): ParsedCandidate | null {
  const combined = `${subject}\n${bodyText}`;
  if (!TRANSACTION_KEYWORDS.test(combined)) return null;

  const match = combined.match(AMOUNT_RE);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(/,/g, ""));
  if (!amount || amount <= 0) return null;

  const type: TransactionType = INCOME_KEYWORDS.test(combined) ? "income" : "expense";
  const suggestion = suggestCategory(subject, type);

  return {
    amount,
    type,
    category: suggestion?.category ?? null,
    note: subject.trim().slice(0, 120) || "Email transaction",
  };
}
