"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailConnection, EmailTransactionCandidate } from "@/lib/types";
import {
  acceptEmailCandidate,
  connectEmailAccount,
  disconnectEmailAccount,
  dismissEmailCandidate,
  scanEmailInbox,
} from "./actions";
import ConnectEmailForm from "./components/ConnectEmailForm";
import EmailCandidateList from "./components/EmailCandidateList";
import Toast from "@/app/app/components/Toast";

export default function SettingsShell({
  initialConnection,
  initialCandidates,
  userEmail,
}: {
  initialConnection: EmailConnection | null;
  initialCandidates: EmailTransactionCandidate[];
  userEmail: string;
}) {
  const router = useRouter();
  const [connection, setConnection] = useState(initialConnection);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [toast, setToast] = useState<string | null>(null);
  const [candidateActionId, setCandidateActionId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scanning, startScan] = useTransition();

  // Sync local state when the server component re-fetches fresh data (e.g.
  // after router.refresh() post-scan) — useState only seeds from props once.
  useEffect(() => setCandidates(initialCandidates), [initialCandidates]);
  useEffect(() => setConnection(initialConnection), [initialConnection]);

  function handleConnect(formData: FormData) {
    startTransition(async () => {
      const result = await connectEmailAccount(formData);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not connect — please try again.");
        return;
      }
      setConnection(result.data);
      setToast("Inbox connected — click \"Scan inbox\" to look for transactions.");
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectEmailAccount();
      if (result.error) {
        setToast(result.error);
        return;
      }
      setConnection(null);
      setCandidates([]);
      setToast("Inbox disconnected.");
    });
  }

  function handleScan() {
    startScan(async () => {
      const result = await scanEmailInbox();
      if ("error" in result) {
        setToast(result.error);
        return;
      }
      setConnection((prev) => (prev ? { ...prev, last_scanned_at: new Date().toISOString() } : prev));
      setToast(
        result.found > 0
          ? `Found ${result.found} new transaction${result.found === 1 ? "" : "s"} from ${result.scanned} emails scanned.`
          : `No new transactions found (scanned ${result.scanned} emails).`,
      );
      router.refresh();
    });
  }

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
      setToast("Added to your transactions.");
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

  return (
    <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/app" className="text-sm text-neutral-400 hover:text-neutral-600">
              ← Back to app
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">⚙️ Settings</h1>
          </div>
          <span className="hidden text-sm text-neutral-500 sm:inline">{userEmail}</span>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-sm font-medium text-neutral-500">Import transactions from email</h2>

          {connection ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    ✓ Connected as {connection.email}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {connection.last_scanned_at
                      ? `Last scanned ${new Date(connection.last_scanned_at).toLocaleString()}`
                      : "Never scanned yet"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {scanning ? "Scanning…" : "Scan inbox"}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={pending}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300 hover:bg-neutral-100 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <ConnectEmailForm onSubmit={handleConnect} pending={pending} />
            </div>
          )}
        </div>

        {connection && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-900">
              Found in your inbox — review before adding
            </h2>
            <EmailCandidateList
              candidates={candidates}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              pendingId={candidateActionId}
            />
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </main>
  );
}
