"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailTransactionCandidate } from "@/lib/types";
import {
  acceptAllCleanCandidates,
  acceptEmailCandidate,
  blockSender,
  dismissEmailCandidate,
  trustSender,
  undoAutoPost,
} from "@/app/settings/actions";
import EmailCandidateList from "@/app/settings/components/EmailCandidateList";
import AppChrome from "@/app/components/AppChrome";
import Toast from "@/app/app/components/Toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { CurrencyProvider } from "@/app/components/CurrencyProvider";

export default function ReviewShell({
  hasConnection,
  initialCandidates,
  initialAutoPosted,
  userEmail,
  isPro,
  currency,
  locale,
}: {
  hasConnection: boolean;
  initialCandidates: EmailTransactionCandidate[];
  initialAutoPosted: EmailTransactionCandidate[];
  userEmail: string;
  isPro: boolean;
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [autoPosted, setAutoPosted] = useState(initialAutoPosted);
  const [toast, setToast] = useState<string | null>(null);
  const [candidateActionId, setCandidateActionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [bulkAccepting, startBulkAccept] = useTransition();

  const cleanCount = candidates.filter((c) => !c.review_reason).length;

  useEffect(() => setCandidates(initialCandidates), [initialCandidates]);
  useEffect(() => setAutoPosted(initialAutoPosted), [initialAutoPosted]);

  function handleAccept(id: string) {
    setCandidateActionId(id);
    startTransition(async () => {
      const result = await acceptEmailCandidate(id);
      setCandidateActionId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setToast("Added to your ledger.");
    });
  }

  function handleDismiss(id: string) {
    setCandidateActionId(id);
    startTransition(async () => {
      const result = await dismissEmailCandidate(id);
      setCandidateActionId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
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

  function handleUndo(id: string) {
    setCandidateActionId(id);
    startTransition(async () => {
      const result = await undoAutoPost(id);
      setCandidateActionId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setAutoPosted((prev) => prev.filter((c) => c.id !== id));
      setToast("Undone — it's back in review.");
      router.refresh();
    });
  }

  return (
    <CurrencyProvider currency={currency} locale={locale}>
    <AppChrome userEmail={userEmail} isPro={isPro} pendingReviewCount={candidates.length}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-ink">
            👀 Review{candidates.length > 0 ? ` · ${candidates.length}` : ""}
          </h1>
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
        {candidates.length > 0 || hasConnection ? (
          <EmailCandidateList
            candidates={candidates}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
            onTrustSender={handleTrustSender}
            onBlockSender={handleBlockSender}
            pendingId={candidateActionId}
          />
        ) : (
          <div className="rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-line">
            <p className="text-sm text-ink-subtle">
              Connect your inbox or upload a bank statement on the{" "}
              <Link href="/settings" className="font-medium text-jade underline">
                Capture
              </Link>{" "}
              screen and captured transactions will wait for you here.
            </p>
          </div>
        )}
      </div>

      {autoPosted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">⚡ Auto-posted recently</h2>
          <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line">
            <ul className="divide-y divide-line">
              {autoPosted.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-6 py-3">
                  <span className="rounded-full bg-jade-soft px-1.5 py-px font-mono text-[10px] text-jade">
                    ⚡
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{c.subject}</p>
                    <p className="font-mono text-[10px] text-ink-faint">
                      {c.email_date ? formatDate(c.email_date.slice(0, 10)) : ""}
                      {c.account_tag ? ` · ${c.account_tag}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                    {c.suggested_type === "income" ? "+" : "−"}
                    {c.amount !== null ? formatCurrency(c.amount, currency, locale) : "—"}
                  </span>
                  <button
                    onClick={() => handleUndo(c.id)}
                    disabled={candidateActionId === c.id}
                    className="font-mono text-[11px] font-medium text-vermilion hover:text-vermilion disabled:opacity-50"
                  >
                    {candidateActionId === c.id ? "…" : "UNDO"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </AppChrome>
    </CurrencyProvider>
  );
}
