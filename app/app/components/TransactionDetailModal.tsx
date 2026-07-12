"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Transaction, TransactionProvenance } from "@/lib/types";

const SOURCE_LABEL: Record<TransactionProvenance["source"], string> = {
  email: "✉ email capture",
  sms: "💬 SMS capture",
  csv: "📄 CSV import",
  pdf: "📄 PDF import",
  image: "🖼 screenshot import",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-neutral-800">{children}</dd>
    </div>
  );
}

/**
 * The double-check view: everything Fortune Cat knows about how a row entered
 * the ledger, down to the raw snippet it was parsed from.
 */
export default function TransactionDetailModal({
  transaction: t,
  category,
  provenance,
  onClose,
  onEdit,
}: {
  transaction: Transaction;
  category: Category | undefined;
  provenance: TransactionProvenance | undefined;
  onClose: () => void;
  onEdit: () => void;
}) {
  const isIncome = t.type === "income";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-2xl">{category?.icon ?? "•"}</span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-neutral-900">
                {t.note || category?.name || "Transaction"}
              </p>
              <p className="text-xs text-neutral-500">{formatDate(t.date)}</p>
            </div>
          </div>
          <span
            className={`text-lg font-bold [font-variant-numeric:tabular-nums] ${isIncome ? "text-emerald-700" : "text-neutral-900"}`}
          >
            {isIncome ? "+" : "-"}
            {formatCurrency(t.amount)}
          </span>
        </div>

        <dl className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100">
          <Row label="Category">{category?.name ?? "Uncategorized"}</Row>
          {t.account_tag && <Row label="Account">{t.account_tag}</Row>}
          {t.original_currency && t.original_amount != null && (
            <Row label="Original amount">
              {t.original_currency} {t.original_amount.toLocaleString("en-SG")}{" "}
              <span className="text-xs text-neutral-400">→ SGD at capture</span>
            </Row>
          )}
          <Row label="Entered via">
            {t.entry_source === "manual" && "✍ manual entry"}
            {t.entry_source === "email_auto" && "⚡ auto-posted (trusted sender)"}
            {t.entry_source === "email_review" && "✉ accepted from review"}
            {t.entry_source === "sms" && "💬 SMS · accepted from review"}
            {t.entry_source === "csv" && (provenance ? SOURCE_LABEL[provenance.source] : "📄 import")}
          </Row>
          {provenance?.from_address && <Row label="Captured from">{provenance.from_address}</Row>}
          {provenance?.subject && (
            <Row label="Subject">
              <span className="line-clamp-2">{provenance.subject}</span>
            </Row>
          )}
          {provenance?.email_date && (
            <Row label="Received">{new Date(provenance.email_date).toLocaleString("en-SG")}</Row>
          )}
          {provenance?.review_reason && (
            <Row label="Review reason">{provenance.review_reason}</Row>
          )}
          {provenance && (
            <Row label="Reference">
              <span className="break-all font-mono text-xs text-neutral-500">
                {provenance.message_id}
              </span>
            </Row>
          )}
          <Row label="Added">{new Date(t.created_at).toLocaleString("en-SG")}</Row>
        </dl>

        {provenance?.raw_snippet && (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Source snippet</p>
            <pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed text-neutral-500">
              {provenance.raw_snippet}
            </pre>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onEdit}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300 hover:bg-neutral-100"
          >
            Edit
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
