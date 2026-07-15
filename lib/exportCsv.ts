import type { Category, Transaction } from "./types";

/**
 * Plain-CSV export of the user's own transactions. Amounts are raw numbers
 * (no currency symbol/thousands separator) so a spreadsheet can sum them
 * directly; RFC 4180-style quoting for any field containing a comma, quote,
 * or newline.
 */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HEADERS = ["Date", "Type", "Category", "Amount", "Note", "Source", "Account tag"];

export function transactionsToCsv(transactions: Transaction[], categories: Category[]): string {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    (t.category_id && categoryName.get(t.category_id)) || "",
    t.amount.toFixed(2),
    t.note ?? "",
    t.entry_source,
    t.account_tag ?? "",
  ]);
  return [HEADERS, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");
}
