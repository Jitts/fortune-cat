import type { Category, Transaction } from "@/lib/types";

/**
 * Shows the rule-based category suggestion for an unreviewed transaction, with
 * accept/reject controls. Hidden once the user has reviewed it.
 */
export default function AiTagBadge({
  transaction,
  categories,
  onAccept,
  onReject,
  pending,
}: {
  transaction: Transaction;
  categories: Category[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  pending: boolean;
}) {
  if (!transaction.ai_category || transaction.ai_category_review_status !== "unreviewed") {
    return null;
  }

  const suggested = categories.find((c) => c.name === transaction.ai_category);
  const pct = Math.round((transaction.ai_category_confidence ?? 0) * 100);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
        ✨ Suggested: {suggested?.icon} {transaction.ai_category}
        <span className="text-violet-400">· {pct}%</span>
      </span>
      <button
        onClick={() => onAccept(transaction.id)}
        disabled={pending}
        className="text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
      >
        Accept
      </button>
      <button
        onClick={() => onReject(transaction.id)}
        disabled={pending}
        className="text-xs font-medium text-ink-faint hover:text-ink-muted disabled:opacity-50"
      >
        Dismiss
      </button>
    </div>
  );
}
