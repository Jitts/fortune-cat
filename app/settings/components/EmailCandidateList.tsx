import { formatCurrency, formatDate } from "@/lib/format";
import type { EmailTransactionCandidate } from "@/lib/types";

export default function EmailCandidateList({
  candidates,
  onAccept,
  onDismiss,
  onTrustSender,
  pendingId,
}: {
  candidates: EmailTransactionCandidate[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onTrustSender: (fromAddress: string) => void;
  pendingId: string | null;
}) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-line">
        <p className="text-sm text-ink-subtle">
          Review is clear — new captures from trusted senders post automatically; anything the
          scanner isn’t sure about will wait for you here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line">
      <ul className="divide-y divide-line">
        {candidates.map((c) => {
          const uncertain = c.review_reason?.includes("uncertain") || c.review_reason?.includes("failed");
          const unknownSender = c.review_reason === "unrecognised sender";
          return (
            <li key={c.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.subject}</p>
                  <p className="truncate font-mono text-xs text-ink-faint">
                    {c.email_date ? formatDate(c.email_date.slice(0, 10)) : ""} · {c.from_address}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 [font-variant-numeric:tabular-nums]">
                      {c.suggested_type === "income" ? "+" : "-"}
                      {c.amount !== null ? formatCurrency(c.amount) : "—"}
                    </span>
                    {c.suggested_category && (
                      <span className="inline-flex items-center rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-muted">
                        {c.suggested_category}
                      </span>
                    )}
                    {c.account_tag && (
                      <span className="inline-flex items-center rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-subtle">
                        {c.account_tag}
                      </span>
                    )}
                    {c.source !== "email" && (
                      <span className="inline-flex items-center rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-ink-subtle">
                        {c.source === "image" ? "🖼" : c.source === "sms" ? "💬" : "📄"} {c.source}
                      </span>
                    )}
                    {c.review_reason && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          uncertain ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {uncertain ? "⚠ " : ""}
                        {c.review_reason}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
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
                      className="text-xs font-medium text-ink-faint hover:text-ink-muted disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                  {unknownSender && c.from_address && (
                    <button
                      onClick={() => onTrustSender(c.from_address!)}
                      disabled={pendingId === c.id}
                      className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Trust sender
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
