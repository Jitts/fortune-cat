import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Transaction, TransactionProvenance } from "@/lib/types";
import AiTagBadge from "./AiTagBadge";

export default function TransactionList({
  transactions,
  categories,
  provenance,
  onDetails,
  onEdit,
  onDelete,
  deletingId,
  onAcceptTag,
  onRejectTag,
  tagPending,
}: {
  transactions: Transaction[];
  categories: Category[];
  provenance: Record<string, TransactionProvenance>;
  onDetails: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  onAcceptTag: (id: string) => void;
  onRejectTag: (id: string) => void;
  tagPending: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-neutral-200">
        <p className="text-sm text-neutral-500">No transactions yet — add your first one</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
      <ul className="divide-y divide-neutral-100">
        {transactions.map((t) => {
          const category = categories.find((c) => c.id === t.category_id);
          const isIncome = t.type === "income";
          const prov = provenance[t.id];
          return (
            <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => onDetails(t)}
                  className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left hover:opacity-80"
                  title="View details"
                >
                  <span className="text-xl">{category?.icon ?? "•"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {t.note || category?.name || "Transaction"}
                    </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
                    <span>
                      {formatDate(t.date)} · {category?.name ?? "Uncategorized"}
                    </span>
                    {t.entry_source === "email_auto" && (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-px font-mono text-[10px] text-emerald-700">
                        ⚡ auto
                      </span>
                    )}
                    {t.entry_source === "email_review" && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-px font-mono text-[10px] text-neutral-500">
                        ✉ reviewed
                      </span>
                    )}
                    {t.entry_source === "csv" && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-px font-mono text-[10px] text-neutral-500">
                        📄 import
                      </span>
                    )}
                    {t.entry_source === "sms" && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-px font-mono text-[10px] text-neutral-500">
                        💬 sms
                      </span>
                    )}
                    {t.account_tag && (
                      <span className="rounded bg-neutral-100 px-1.5 py-px font-mono text-[10px] uppercase text-neutral-500">
                        {t.account_tag}
                      </span>
                    )}
                    {t.original_currency && t.original_amount != null && (
                      <span className="font-mono text-[10px] text-neutral-400">
                        {t.original_currency} {t.original_amount.toLocaleString("en-SG")}
                      </span>
                    )}
                  </p>
                    {prov && (
                      <p className="truncate font-mono text-[10px] text-neutral-300">
                        {prov.from_address ?? prov.source} · ref {prov.message_id.slice(0, 18)}
                      </p>
                    )}
                  </div>
                </button>
                <div className="pl-9">
                  <AiTagBadge
                    transaction={t}
                    categories={categories}
                    onAccept={onAcceptTag}
                    onReject={onRejectTag}
                    pending={tagPending}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${isIncome ? "text-emerald-700" : "text-neutral-900"}`}
                >
                  {isIncome ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </span>
                <button
                  onClick={() => onEdit(t)}
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === t.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
