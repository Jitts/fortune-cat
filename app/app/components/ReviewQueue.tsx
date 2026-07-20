"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { useMoney } from "@/app/components/CurrencyProvider";
import type { EmailTransactionCandidate } from "@/lib/types";
import {
  acceptAllCleanCandidates,
  acceptEmailCandidate,
  blockSender,
  dismissEmailCandidate,
  restoreFilteredCandidate,
  trustSender,
} from "@/app/settings/actions";
import EmailCandidateList from "@/app/settings/components/EmailCandidateList";
import Toast from "./Toast";

/**
 * The review queue embedded above the ledger list — the same pending queue
 * as /review (which stays for the nav badge + auto-posted history).
 * Accepting refreshes the server data so the new row appears in the ledger.
 */
export default function ReviewQueue({
  initialCandidates,
  initialFiltered = [],
}: {
  initialCandidates: EmailTransactionCandidate[];
  initialFiltered?: EmailTransactionCandidate[];
}) {
  const router = useRouter();
  const { format } = useMoney();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [filtered, setFiltered] = useState(initialFiltered);
  const [showFiltered, setShowFiltered] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [bulkAccepting, startBulkAccept] = useTransition();

  // Scans and the 60s poll land fresh data through the server component.
  useEffect(() => setCandidates(initialCandidates), [initialCandidates]);
  useEffect(() => setFiltered(initialFiltered), [initialFiltered]);

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

  function handleAcceptFiltered(id: string) {
    setActionId(id);
    startTransition(async () => {
      const result = await acceptEmailCandidate(id);
      setActionId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setFiltered((prev) => prev.filter((c) => c.id !== id));
      setToast("Added to your ledger.");
      router.refresh();
    });
  }

  function handleRestore(id: string) {
    setActionId(id);
    startTransition(async () => {
      const result = await restoreFilteredCandidate(id);
      setActionId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setFiltered((prev) => prev.filter((c) => c.id !== id));
      setToast("Restored to Review.");
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

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line">
          <button
            onClick={() => setShowFiltered((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
          >
            <span className="text-sm font-medium text-ink-subtle">
              🚫 Filtered by other users · {filtered.length}
            </span>
            <span className="text-xs text-ink-faint">{showFiltered ? "Hide ▲" : "Show ▼"}</span>
          </button>
          {showFiltered && (
            <ul className="divide-y divide-line border-t border-line">
              {filtered.map((c) => (
                <li key={c.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{c.subject}</p>
                      <p className="truncate font-mono text-xs text-ink-faint">
                        {c.email_date ? formatDate(c.email_date.slice(0, 10)) : ""} · {c.from_address}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-gold-text [font-variant-numeric:tabular-nums]">
                          {c.suggested_type === "income" ? "+" : "-"}
                          {c.amount !== null ? format(c.amount) : "—"}
                        </span>
                        {c.review_reason && (
                          <span className="inline-flex items-center rounded-full bg-vermilion-soft px-2 py-0.5 text-xs font-medium text-vermilion">
                            {c.review_reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        onClick={() => handleRestore(c.id)}
                        disabled={actionId === c.id}
                        className="text-xs font-medium text-jade hover:text-jade disabled:opacity-50"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleAcceptFiltered(c.id)}
                        disabled={actionId === c.id}
                        className="text-xs font-medium text-ink-faint hover:text-ink-muted disabled:opacity-50"
                      >
                        Accept anyway
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-6 py-3 text-xs text-ink-faint">
            These senders were independently blocked by several other Fortune Cat users, so new
            captures from them are filtered out by default. Nothing is ever silently dropped —
            restore any of them back to Review if that&apos;s wrong for you.
          </p>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
