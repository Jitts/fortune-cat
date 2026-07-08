"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Category, Transaction } from "@/lib/types";
import { addTransaction, deleteTransaction, updateTransaction } from "./actions";
import BalanceHeader from "./components/BalanceHeader";
import CategoryBreakdown from "./components/CategoryBreakdown";
import TransactionList from "./components/TransactionList";
import TransactionForm, {
  emptyFormValues,
  transactionToFormValues,
} from "./components/TransactionForm";
import Toast from "./components/Toast";

const FREE_TIER_LIMIT = 10;

export default function AppShell({
  initialTransactions,
  categories,
  isPro,
}: {
  initialTransactions: Transaction[];
  categories: Category[];
  isPro: boolean;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [modal, setModal] = useState<"add" | Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const balance = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
  }, [transactions]);

  const visibleTransactions = isPro ? transactions : transactions.slice(0, FREE_TIER_LIMIT);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addTransaction(formData);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not save — please try again.");
        return;
      }
      const created = result.data;
      setTransactions((prev) => [created, ...prev]);
      setModal(null);
    });
  }

  function handleEdit(id: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateTransaction(id, formData);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not save — please try again.");
        return;
      }
      const updated = result.data;
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setModal(null);
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteTransaction(id);
      setDeletingId(null);
      if (result.error) {
        setToast(result.error);
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    });
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">🐱 Fortune Cat</h1>
          {!isPro && (
            <Link
              href="/upgrade"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Go Pro
            </Link>
          )}
        </div>

        <BalanceHeader balance={balance} isPro={isPro} />
        <CategoryBreakdown transactions={transactions} categories={categories} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Transactions</h2>
          <button
            onClick={() => setModal("add")}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Add Transaction
          </button>
        </div>

        {!isPro && transactions.length > FREE_TIER_LIMIT && (
          <p className="text-xs text-neutral-400">
            Showing your {FREE_TIER_LIMIT} most recent transactions.{" "}
            <Link href="/upgrade" className="underline hover:text-neutral-600">
              Go Pro
            </Link>{" "}
            to see full history.
          </p>
        )}

        <TransactionList
          transactions={visibleTransactions}
          categories={categories}
          onEdit={(t) => setModal(t)}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </div>

      {modal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              {modal === "add" ? "Add Transaction" : "Edit Transaction"}
            </h3>
            <TransactionForm
              categories={categories}
              initial={modal === "add" ? emptyFormValues(categories) : transactionToFormValues(modal)}
              submitLabel={modal === "add" ? "Add" : "Save"}
              pending={pending}
              onCancel={() => setModal(null)}
              onSubmit={(formData) =>
                modal === "add" ? handleAdd(formData) : handleEdit(modal.id, formData)
              }
            />
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </main>
  );
}
