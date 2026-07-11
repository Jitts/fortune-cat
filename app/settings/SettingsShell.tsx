"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailConnection, TrustedSender } from "@/lib/types";
import {
  connectEmailAccount,
  disconnectEmailAccount,
  importDocument,
  importStatementCsv,
  scanEmailInbox,
  scanOlderEmails,
  trustSender,
  untrustSender,
} from "./actions";
import ConnectEmailForm from "./components/ConnectEmailForm";
import AppChrome from "@/app/components/AppChrome";
import Toast from "@/app/app/components/Toast";

export default function SettingsShell({
  initialConnection,
  initialTrustedSenders,
  pendingReviewCount,
  userEmail,
  isPro,
}: {
  initialConnection: EmailConnection | null;
  initialTrustedSenders: TrustedSender[];
  pendingReviewCount: number;
  userEmail: string;
  isPro: boolean;
}) {
  const router = useRouter();
  const [connection, setConnection] = useState(initialConnection);
  const [trustedSenders, setTrustedSenders] = useState(initialTrustedSenders);
  const [newPattern, setNewPattern] = useState("");
  const [csvAccountTag, setCsvAccountTag] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scanning, startScan] = useTransition();
  const [scanningOlder, startScanOlder] = useTransition();
  const [importing, startImport] = useTransition();
  const [importStage, setImportStage] = useState<string | null>(null);
  const [reachedStart, setReachedStart] = useState(
    initialConnection?.oldest_scanned_seq != null && initialConnection.oldest_scanned_seq <= 1,
  );

  // Sync local state when the server component re-fetches fresh data (e.g.
  // after router.refresh() post-scan) — useState only seeds from props once.
  useEffect(() => setConnection(initialConnection), [initialConnection]);
  useEffect(() => setTrustedSenders(initialTrustedSenders), [initialTrustedSenders]);

  function scanToast(result: { found: number; autoPosted: number; scanned: number }, older = false) {
    const where = older ? "older emails" : "emails";
    if (result.found === 0) return `No new transactions found (scanned ${result.scanned} ${where}).`;
    const parts = [`Found ${result.found} new transaction${result.found === 1 ? "" : "s"}`];
    if (result.autoPosted > 0) parts.push(`${result.autoPosted} auto-posted ⚡`);
    if (result.found - result.autoPosted > 0) parts.push(`${result.found - result.autoPosted} waiting for review`);
    return `${parts.join(" · ")} (from ${result.scanned} ${where}).`;
  }

  function handleConnect(formData: FormData) {
    startTransition(async () => {
      const result = await connectEmailAccount(formData);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not connect — please try again.");
        return;
      }
      setConnection(result.data);
      setReachedStart(false);
      setToast("Inbox connected — click \"Scan now\" to look for transactions.");
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
      setReachedStart(result.reachedStart);
      setToast(scanToast(result));
      router.refresh();
    });
  }

  function handleScanOlder() {
    startScanOlder(async () => {
      const result = await scanOlderEmails();
      if ("error" in result) {
        setToast(result.error);
        return;
      }
      setReachedStart(result.reachedStart);
      setToast(
        result.scanned === 0
          ? "Reached the oldest email in your inbox — nothing further back to scan."
          : scanToast(result, true),
      );
      router.refresh();
    });
  }

  function handleTrustPattern(value: string) {
    startTransition(async () => {
      const result = await trustSender(value);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not save — please try again.");
        return;
      }
      const added = result.data;
      setTrustedSenders((prev) =>
        prev.some((t) => t.id === added.id) ? prev : [...prev, added].sort((a, b) => a.pattern.localeCompare(b.pattern)),
      );
      setToast(`Trusted ${added.pattern} — future SGD captures from it post automatically.`);
    });
  }

  function handleAddPattern(e: React.FormEvent) {
    e.preventDefault();
    if (!newPattern.trim()) return;
    const value = newPattern.trim();
    setNewPattern("");
    handleTrustPattern(value.includes("@") ? value : `@${value}`);
  }

  function handleUntrust(id: string) {
    startTransition(async () => {
      const result = await untrustSender(id);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setTrustedSenders((prev) => prev.filter((t) => t.id !== id));
    });
  }

  function handleFileUpload(file: File | null) {
    if (!file) return;
    startImport(async () => {
      try {
        const formData = new FormData();
        formData.set("filename", file.name);
        formData.set("account_tag", csvAccountTag);

        let result;
        const name = file.name.toLowerCase();
        if (name.endsWith(".csv") || file.type === "text/csv") {
          setImportStage("Reading CSV…");
          formData.set("csv", await file.text());
          result = await importStatementCsv(formData);
        } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
          if (file.size > 20_000_000) {
            setToast("That PDF is over 20MB — export a shorter statement period.");
            return;
          }
          // Text extraction runs HERE in the browser (pdfjs) — the PDF never
          // leaves the device; only the extracted text goes to the server.
          // (Server-side pdfjs needs DOM globals that serverless Node lacks.)
          setImportStage("Reading PDF…");
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString();
          const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
            .promise;
          let text = "";
          for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const content = await page.getTextContent();
            for (const item of content.items) {
              if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
            }
            text += "\n";
          }
          await doc.cleanup();
          if (!text.trim()) {
            setToast(
              "That PDF has no extractable text (it's likely a scan) — screenshot it and upload the image instead.",
            );
            return;
          }
          formData.set("kind", "pdf");
          formData.set("text", text);
          result = await importDocument(formData);
        } else if (file.type.startsWith("image/")) {
          // OCR runs HERE in the browser (tesseract.js) — the image never
          // leaves the device; only the recognised text goes to the server.
          setImportStage("Reading image… (first run downloads the OCR engine)");
          const Tesseract = (await import("tesseract.js")).default;
          const ocr = await Tesseract.recognize(file, "eng");
          formData.set("kind", "image");
          formData.set("text", ocr.data.text ?? "");
          result = await importDocument(formData);
        } else {
          setToast("Unsupported file — upload a CSV, PDF, or a screenshot (PNG/JPG).");
          return;
        }

        if ("error" in result) {
          setToast(result.error);
          return;
        }
        const parts = [
          `Imported ${result.found} transaction${result.found === 1 ? "" : "s"} to review`,
        ];
        if (result.flagged > 0) parts.push(`${result.flagged} flagged as possible duplicates`);
        if (result.parsed - result.found > 0) parts.push(`${result.parsed - result.found} already imported before`);
        setToast(`${parts.join(" · ")}.`);
        router.refresh();
      } catch (err) {
        console.error("[handleFileUpload]", err);
        setToast("Something went wrong reading that file — please try again.");
      } finally {
        setImportStage(null);
      }
    });
  }

  return (
    <AppChrome userEmail={userEmail} isPro={isPro} pendingReviewCount={pendingReviewCount}>
      <h1 className="text-lg font-semibold text-neutral-900">📡 Capture</h1>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-neutral-500">📧 Email auto-scan</h2>
          {connection && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-emerald-700">
              ON · DAILY 7AM SGT
            </span>
          )}
        </div>

        {connection ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">✓ Connected as {connection.email}</p>
              <p className="text-xs text-emerald-600">
                {connection.last_scanned_at
                  ? `Last scanned ${new Date(connection.last_scanned_at).toLocaleString("en-SG")}`
                  : "Never scanned yet"}
                {" · "}scans run automatically every morning; the buttons below scan on demand.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {scanning ? "Scanning…" : "Scan now"}
              </button>
              <button
                onClick={handleScanOlder}
                disabled={scanningOlder || reachedStart || connection.oldest_scanned_seq == null}
                title={
                  connection.oldest_scanned_seq == null
                    ? 'Run "Scan now" first'
                    : reachedStart
                      ? "Already reached the oldest email in your inbox"
                      : "Look further back for older transactions (e.g. old receipts, hotel stays)"
                }
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300 hover:bg-neutral-100 disabled:opacity-50"
              >
                {scanningOlder ? "Scanning…" : "Scan older emails"}
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
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-sm font-medium text-neutral-500">⚡ Trusted senders</h2>
          <p className="mt-1 text-xs text-neutral-400">
            SGD transactions from these senders post straight to your ledger (with one-tap undo).
            Everything else — including all foreign currency — waits in{" "}
            <Link href="/review" className="underline hover:text-neutral-600">
              Review
            </Link>
            . Nothing auto-posts without a rule you set here.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {trustedSenders.length === 0 && (
              <p className="text-xs text-neutral-400">
                None yet — use “Trust sender” on a review item, or add a domain:
              </p>
            )}
            {trustedSenders.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-700"
              >
                ✓ {t.pattern}
                <button
                  onClick={() => handleUntrust(t.id)}
                  disabled={pending}
                  title={`Stop auto-posting from ${t.pattern}`}
                  className="text-emerald-400 hover:text-emerald-800 disabled:opacity-50"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddPattern} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="dbs.com"
              className="w-44 rounded-lg border border-neutral-300 px-3 py-1.5 font-mono text-xs focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !newPattern.trim()}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-600 ring-1 ring-neutral-300 hover:bg-neutral-100 disabled:opacity-50"
            >
              Trust domain
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3 pb-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-neutral-500">📄 Statements &amp; receipts</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-emerald-700">
              CSV · PDF · SCREENSHOT
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Upload a DBS / POSB / OCBC / UOB statement (CSV or PDF e-statement), a PDF receipt, or a
            screenshot of either — screenshots are read on your device and never uploaded. Every row
            lands in{" "}
            <Link href="/review" className="underline hover:text-neutral-600">
              Review
            </Link>{" "}
            first; anything matching an amount already in your ledger gets flagged as a possible
            duplicate, and re-uploading the same file never double-imports.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={csvAccountTag}
              onChange={(e) => setCsvAccountTag(e.target.value)}
              placeholder="account tag e.g. POSB"
              className="w-44 rounded-lg border border-neutral-300 px-3 py-1.5 font-mono text-xs focus:border-neutral-500 focus:outline-none"
            />
            <label
              className={`cursor-pointer rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 ${
                importing ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {importing ? (importStage ?? "Importing…") : "Choose file"}
              <input
                type="file"
                accept=".csv,text/csv,.pdf,application/pdf,image/*"
                className="hidden"
                disabled={importing}
                onChange={(e) => {
                  handleFileUpload(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-neutral-600">💬 SMS forwarding</h3>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-mono text-[10px] text-neutral-500">
              PHASE 3
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            SG banks SMS every card transaction. A phone shortcut will forward them here — the
            widest net, in real time.
          </p>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </AppChrome>
  );
}
