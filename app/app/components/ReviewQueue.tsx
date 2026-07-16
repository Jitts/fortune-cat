"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EmailTransactionCandidate } from "@/lib/types";
import {
  acceptAllCleanCandidates,
  acceptEmailCandidate,
  blockSender,
  dismissEmailCandidate,
  trustSender,
} from "@/app/settings/actions";
import EmailCandidateList from "@/app/settings/components/EmailCandidateList";
import Toast from "./Toast";

/**
 * The review queue embedded below the ledger — the same pending queue as
 * /review (which stays for the nav badge + auto-posted history). Accepting
 * refreshes the server data so the new row appears in the ledger above.
 */
export default function ReviewQueue({
  initialCandidates,
}: {
  initialCandidates: EmailTransactionCandidate[];
}) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [toast, setToast] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [bulkAccepting, startBulkAccept] = useTransition();

  // Scans and the 60s poll land fresh data through the server component.
  useEffect(() => setCandidates(initialCandidates), [initialCandidates]);

  const cleanCount = candidates.filter((c) => !c.review_reason).length;

  function handleAccept(id: string) {
    setActionId(id);
    startTransition(async () => {
      const result = await acceptEmailCandidate(id);
      setActionId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setToast("Added to your ledger.");
      router.refresh();
    });
  }

  function handleDismiss(id: string) {
    setActionId(id);
    startTransition(async () => {
      const result = await dismissEmailCandidate(id);
      setActionId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    });
  }

  function handleTrustSender(fromAddress: string) {
    startTransition(async () => {
      const result = await trustSender(fromAddress);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not save — please try again.");
        return;
      }
      setToast(`Trusted ${result.data.pattern} — future SGD captures from it post automatically.`);
      router.refresh();
    });
  }

  function handleBlockSender(fromAddress: string) {
    startTransition(async () => {
      const result = await blockSender(fromAddress);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not save — please try again.");
        return;
      }
      const pattern = result.data.pattern;
      setCandidates((prev) =>
        prev.filter((c) => !(c.from_address ?? "").toLowerCase().includes(pattern)),
      );
      setToast(
        `Blocked ${pattern} — future scans skip it${result.dismissed > 0 ? ` (${result.dismissed} pending item${result.dismissed === 1 ? "" : "s"} dismissed)` : ""}. Unblock in Settings › Capture.`,
      );
      router.refresh();
    });
  }

  function handleAcceptAll() {
    startBulkAccept(async () => {
      const result = await acceptAllCleanCandidates();
      if ("error" in result) {
        setToast(result.error);
        return;
      }
      setCandidates((prev) => prev.filter((c) => c.review_reason));
      setToast(
        result.failed > 0
          ? `Accepted ${result.accepted} — ${result.failed} failed, please retry those.`
          : `Accepted ${result.accepted} transaction${result.accepted === 1 ? "" : "s"} to your ledger.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">
          👀 Review{candidates.length > 0 ? ` · ${candidates.length}` : ""}
        </h3>
        {cleanCount >= 2 && (
          <button
            onClick={handleAcceptAll}
            disabled={bulkAccepting}
            title="Accepts every capture without a warning — flagged items (duplicates, foreign currency, unknown senders) stay for individual review."
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {bulkAccepting ? "Accepting…" : `Accept all ${cleanCount} clean`}
          </button>
        )}
      </div>
      <EmailCandidateList
        candidates={candidates}
        onAccept={handleAccept}
        onDismiss={handleDismiss}
        onTrustSender={handleTrustSender}
        onBlockSender={handleBlockSender}
        pendingId={actionId}
      />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
