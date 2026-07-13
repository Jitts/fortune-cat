"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import AppChrome from "@/app/components/AppChrome";
import ProBadge from "@/app/app/components/ProBadge";
import Toast from "@/app/app/components/Toast";
import { signOutAction } from "@/app/auth/actions";
import type { Category, Transaction } from "@/lib/types";
import { changePassword, deleteAccount } from "./actions";

function toCsv(transactions: Transaction[], categories: Category[]): string {
  const name = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Uncategorized";
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["Date", "Type", "Amount", "Category", "Note", "Account", "Source"];
  const rows = transactions.map((t) =>
    [
      t.date,
      t.type,
      String(t.amount),
      name(t.category_id),
      t.note ?? "",
      t.account_tag ?? "",
      t.entry_source,
    ]
      .map((v) => esc(String(v)))
      .join(","),
  );
  return [header.map(esc).join(","), ...rows].join("\n");
}

export default function AccountShell({
  userEmail,
  isPro,
  pendingReviewCount,
  transactions,
  categories,
}: {
  userEmail: string;
  isPro: boolean;
  pendingReviewCount: number;
  transactions: Transaction[];
  categories: Category[];
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function savePassword() {
    const fd = new FormData();
    fd.set("password", pw);
    fd.set("confirm", pwConfirm);
    startTransition(async () => {
      const result = await changePassword(fd);
      if ("error" in result) {
        setPwError(result.error);
        return;
      }
      setPwError(null);
      setPwOpen(false);
      setPw("");
      setPwConfirm("");
      setToast("Password updated ✓");
    });
  }

  function exportCsv() {
    const csv = toCsv(transactions, categories);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fortune-cat-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${transactions.length} transactions`);
  }

  function runDelete() {
    const fd = new FormData();
    fd.set("confirm", confirmDelete);
    startTransition(async () => {
      const result = await deleteAccount(fd);
      // Success redirects; only errors return here.
      if (result?.error) setDeleteError(result.error);
    });
  }

  return (
    <AppChrome userEmail={userEmail} isPro={isPro} pendingReviewCount={pendingReviewCount}>
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Account &amp; privacy</h1>
        <p className="text-sm text-neutral-500">Manage your sign-in, plan, and your data.</p>
      </div>

      {/* ===== Account ===== */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <h2 className="text-sm font-medium text-neutral-500">Account</h2>
        <dl className="mt-3 divide-y divide-neutral-100">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-sm text-neutral-500">Email</dt>
            <dd className="text-sm font-medium text-neutral-900">{userEmail}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-sm text-neutral-500">Plan</dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              {isPro ? (
                <>
                  <ProBadge /> Pro
                </>
              ) : (
                <>
                  Free
                  <Link href="/upgrade" className="text-fortune-700 underline underline-offset-2 hover:no-underline">
                    Go Pro
                  </Link>
                </>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-sm text-neutral-500">Password</dt>
            <dd>
              <button
                onClick={() => {
                  setPwError(null);
                  setPwOpen((v) => !v);
                }}
                className="text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
              >
                {pwOpen ? "Cancel" : "Change password"}
              </button>
            </dd>
          </div>
        </dl>

        {pwOpen && (
          <div className="mt-3 space-y-3 rounded-xl bg-neutral-50 p-4">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-fortune-400 focus:outline-none"
            />
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              placeholder="Confirm new password"
              onKeyDown={(e) => e.key === "Enter" && savePassword()}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-fortune-400 focus:outline-none"
            />
            {pwError && <p className="text-xs text-red-600">{pwError}</p>}
            <button
              onClick={savePassword}
              disabled={pending}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Update password"}
            </button>
          </div>
        )}

        <div className="mt-4 border-t border-neutral-100 pt-4">
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300 hover:bg-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* ===== Privacy & data ===== */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <h2 className="text-sm font-medium text-neutral-500">Privacy &amp; data</h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-600">
          <li className="flex gap-2">
            <span className="text-emerald-700">✓</span>
            Statements and receipts are read <b>on your device</b> — the image or PDF never leaves it,
            only the text it contains is used.
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-700">✓</span>
            Email and SMS are captured through your own credentials and a token you control — revoke
            them any time from Capture.
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-700">✓</span>
            Your data is yours. We don&apos;t sell it, and you can export or delete everything below.
          </li>
        </ul>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={exportCsv}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-100"
          >
            ⬇ Export my data (CSV)
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          {transactions.length} transaction{transactions.length === 1 ? "" : "s"} · downloads a
          spreadsheet you can open anywhere.
        </p>
      </div>

      {/* ===== Danger zone ===== */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-red-200">
        <h2 className="text-sm font-medium text-red-700">Delete account</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Permanently deletes your account and all your data — transactions, goals, budgets, captures
          and connections. This can&apos;t be undone.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            placeholder="Type DELETE"
            className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
          />
          <button
            onClick={runDelete}
            disabled={pending || confirmDelete !== "DELETE"}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {pending ? "Deleting…" : "Delete my account"}
          </button>
        </div>
        {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </AppChrome>
  );
}
