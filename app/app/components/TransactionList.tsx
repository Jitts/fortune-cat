import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";

export default function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
  deletingId,
}: {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
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
          return (
            <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl">{category?.icon ?? "•"}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {t.note || category?.name || "Transaction"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(t.date)} · {category?.name ?? "Uncategorized"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-sm font-semibold ${isIncome ? "text-emerald-600" : "text-neutral-900"}`}
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
