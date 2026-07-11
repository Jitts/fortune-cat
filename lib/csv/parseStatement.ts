import type { TransactionType } from "@/lib/types";

/**
 * Generic SG bank-statement CSV parser. DBS/POSB, OCBC and UOB exports all
 * differ (preamble rows before the table, different column names, different
 * date formats), so instead of three brittle bank-specific parsers this scans
 * for the header row and maps columns by keyword — which also survives the
 * banks quietly renaming a column, and handles unknown banks for free.
 * Everything it finds goes to review, so a mis-read is visible, not silent.
 */

export type StatementRow = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // always positive
  type: TransactionType;
};

export type ParseStatementResult =
  | { rows: StatementRow[]; skipped: number }
  | { error: string };

// Splits one CSV line respecting double-quoted fields ("a, b",c).
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Accepts the formats SG bank exports actually use:
// "09 Jul 2026" / "09-Jul-2026" (DBS), "09/07/2026" dd/mm/yyyy (OCBC/UOB),
// "2026-07-09" ISO.
function parseDate(raw: string): string | null {
  const s = raw.trim();

  let m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -](\d{4})$/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase()];
    if (!month) return null;
    return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;

  return null;
}

function parseMoney(raw: string): number | null {
  const s = raw.replace(/SGD|S\$|\$/gi, "").replace(/,/g, "").trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s);
  const n = parseFloat(s.replace(/[()]/g, ""));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

type ColumnMap = {
  dateIdx: number;
  debitIdx: number | null;
  creditIdx: number | null;
  amountIdx: number | null;
  descIdxs: number[];
};

function mapHeader(cells: string[]): ColumnMap | null {
  const lower = cells.map((c) => c.toLowerCase());

  // Prefer "transaction date" over "value date" when both exist (OCBC).
  let dateIdx = lower.findIndex((c) => c.includes("transaction date"));
  if (dateIdx === -1) dateIdx = lower.findIndex((c) => c.includes("date"));
  if (dateIdx === -1) return null;

  const debitIdx = lower.findIndex((c) => /debit|withdraw/.test(c));
  const creditIdx = lower.findIndex((c) => /credit|deposit/.test(c));
  const amountIdx = lower.findIndex((c) => /^amount/.test(c));
  if (debitIdx === -1 && creditIdx === -1 && amountIdx === -1) return null;

  const descIdxs = lower
    .map((c, i) => (/(description|reference|details|particulars|narrative|remarks|ref\d?)/.test(c) ? i : -1))
    .filter((i) => i !== -1 && i !== dateIdx && i !== debitIdx && i !== creditIdx && i !== amountIdx);

  return {
    dateIdx,
    debitIdx: debitIdx === -1 ? null : debitIdx,
    creditIdx: creditIdx === -1 ? null : creditIdx,
    amountIdx: amountIdx === -1 ? null : amountIdx,
    descIdxs,
  };
}

export function parseStatementCsv(text: string): ParseStatementResult {
  const lines = text.split(/\r?\n/);

  // Skip preamble (account info, statement period, blank rows) by scanning
  // for the first line that maps to a usable header.
  let map: ColumnMap | null = null;
  let headerLine = -1;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const candidate = mapHeader(splitCsvLine(lines[i]));
    if (candidate) {
      map = candidate;
      headerLine = i;
      break;
    }
  }
  if (!map) {
    return {
      error:
        "Couldn't find the statement table — expected a header row with a date column and a debit/withdrawal, credit/deposit or amount column.",
    };
  }

  const rows: StatementRow[] = [];
  let skipped = 0;
  for (let i = headerLine + 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = splitCsvLine(lines[i]);
    const date = parseDate(cells[map.dateIdx] ?? "");
    if (!date) {
      skipped++;
      continue;
    }

    let amount: number | null = null;
    let type: TransactionType = "expense";
    const debit = map.debitIdx != null ? parseMoney(cells[map.debitIdx] ?? "") : null;
    const credit = map.creditIdx != null ? parseMoney(cells[map.creditIdx] ?? "") : null;
    if (debit != null && debit !== 0) {
      amount = Math.abs(debit);
      type = "expense";
    } else if (credit != null && credit !== 0) {
      amount = Math.abs(credit);
      type = "income";
    } else if (map.amountIdx != null) {
      const signed = parseMoney(cells[map.amountIdx] ?? "");
      if (signed != null && signed !== 0) {
        amount = Math.abs(signed);
        type = signed < 0 ? "expense" : "income";
      }
    }
    if (amount == null || amount <= 0) {
      skipped++;
      continue;
    }

    const description =
      map.descIdxs
        .map((idx) => cells[idx] ?? "")
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() || "Statement transaction";

    rows.push({ date, description: description.slice(0, 160), amount, type });
  }

  return { rows, skipped };
}
