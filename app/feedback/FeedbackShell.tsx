"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { FeatureRequest } from "@/lib/types";
import { submitFeatureRequest, toggleVote } from "./actions";
import FeatureRequestForm from "./components/FeatureRequestForm";
import FeatureRequestList from "./components/FeatureRequestList";
import Toast from "@/app/app/components/Toast";

export default function FeedbackShell({
  initialRequests,
  userEmail,
}: {
  initialRequests: FeatureRequest[];
  userEmail: string;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [modalOpen, setModalOpen] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(
    () => [...requests].sort((a, b) => b.vote_count - a.vote_count || a.created_at.localeCompare(b.created_at)),
    [requests],
  );

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitFeatureRequest(formData);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not submit — please try again.");
        return;
      }
      setRequests((prev) => [...prev, result.data]);
      setModalOpen(false);
    });
  }

  function handleVote(id: string) {
    setVotingId(id);
    startTransition(async () => {
      const result = await toggleVote(id);
      setVotingId(null);
      if ("error" in result) {
        setToast(result.error);
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, vote_count: result.voteCount, hasVoted: result.hasVoted } : r,
        ),
      );
    });
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/app" className="text-sm text-neutral-400 hover:text-neutral-600">
              ← Back to app
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">💡 Feature requests</h1>
          </div>
          <span className="hidden text-sm text-neutral-500 sm:inline">{userEmail}</span>
        </div>

        <p className="text-sm text-neutral-500">
          Tell us what you&apos;d like to see next, and upvote the ideas you care about most — the
          top of the list is what we build next.
        </p>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Sorted by votes</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Suggest a feature
          </button>
        </div>

        <FeatureRequestList requests={sorted} onVote={handleVote} votingId={votingId} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">Suggest a feature</h3>
            <FeatureRequestForm
              onSubmit={handleSubmit}
              onCancel={() => setModalOpen(false)}
              pending={pending}
            />
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </main>
  );
}
