import type { FeatureRequest } from "@/lib/types";

export default function FeatureRequestList({
  requests,
  onVote,
  votingId,
}: {
  requests: FeatureRequest[];
  onVote: (id: string) => void;
  votingId: string | null;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-10 text-center shadow-sm ring-1 ring-line">
        <p className="text-sm text-ink-subtle">
          No requests yet — be the first to suggest what we should build next.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line">
      <ul className="divide-y divide-line">
        {requests.map((r) => (
          <li key={r.id} className="flex items-start gap-4 px-6 py-4">
            <button
              onClick={() => onVote(r.id)}
              disabled={votingId === r.id}
              aria-pressed={r.hasVoted}
              className={`flex w-14 shrink-0 flex-col items-center rounded-lg border px-2 py-1.5 transition disabled:opacity-50 ${
                r.hasVoted
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-line text-ink-subtle hover:bg-surface-2"
              }`}
            >
              <span className="text-sm leading-none">▲</span>
              <span className="mt-1 text-sm font-semibold">{r.vote_count}</span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{r.title}</p>
              {r.description && (
                <p className="mt-0.5 text-sm text-ink-subtle">{r.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
