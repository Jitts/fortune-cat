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
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-neutral-200">
        <p className="text-sm text-neutral-500">
          No requests yet — be the first to suggest what we should build next.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
      <ul className="divide-y divide-neutral-100">
        {requests.map((r) => (
          <li key={r.id} className="flex items-start gap-4 px-6 py-4">
            <button
              onClick={() => onVote(r.id)}
              disabled={votingId === r.id}
              aria-pressed={r.hasVoted}
              className={`flex w-14 shrink-0 flex-col items-center rounded-lg border px-2 py-1.5 transition disabled:opacity-50 ${
                r.hasVoted
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              }`}
            >
              <span className="text-sm leading-none">▲</span>
              <span className="mt-1 text-sm font-semibold">{r.vote_count}</span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-900">{r.title}</p>
              {r.description && (
                <p className="mt-0.5 text-sm text-neutral-500">{r.description}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
