import { formatCurrency, formatDate } from "@/lib/format";
import type { EmailTransactionCandidate } from "@/lib/types";

export default function EmailCandidateList({
  candidates,
  onAccept,
  onDismiss,
  pendingId,
}: {
  candidates: EmailTransactionCandidate[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  pendingId: string | null;
}) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200">
        <p className="text-sm text-neutral-500">
          No transactions found yet — click &quot;Scan inbox&quot; to check for new ones.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
      <ul className="divide-y divide-neutral-100">
        {candidates.map((c) => (
          <li key={c.id} className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{c.subject}</p>
                <p className="text-xs text-neutral-500">
                  {c.email_date ? formatDate(c.email_date.slice(0, 10)) : ""} · {c.from_address}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    {c.suggested_type === "income" ? "+" : "-"}
                    {c.amount !== null ? formatCurrency(c.amount) : "—"}
                  </span>
                  {c.suggested_category && (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                      {c.suggested_category}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => onAccept(c.id)}
                  disabled={pendingId === c.id}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={() => onDismiss(c.id)}
                  disabled={pendingId === c.id}
                  className="text-xs font-medium text-neutral-400 hover:text-neutral-600 disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
