"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, CategoryBudget, FortuneGoal, Transaction, TransactionProvenance } from "@/lib/types";
import {
  acceptAiTag,
  addTransaction,
  deleteTransaction,
  rejectAiTag,
  updateTransaction,
} from "./actions";
import AppChrome from "@/app/components/AppChrome";
import AutopilotChecklist from "./components/AutopilotChecklist";
import TransactionDetailModal from "./components/TransactionDetailModal";
import PulseCard from "./components/PulseCard";
import FortuneGoals from "./components/FortuneGoals";
import RecurringRadar from "./components/RecurringRadar";
import MonthlyOverview from "./components/MonthlyOverview";
import CategoryBreakdown from "./components/CategoryBreakdown";
import FortuneBudget from "./components/FortuneBudget";
import InsightCard from "./components/InsightCard";
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
  isPro: initialIsPro,
  userEmail,
  pendingReviewCount,
  provenance,
  setup,
  goals,
  budgets,
}: {
  initialTransactions: Transaction[];
  categories: Category[];
  isPro: boolean;
  userEmail: string;
  pendingReviewCount: number;
  provenance: Record<string, TransactionProvenance>;
  setup: { captured: boolean; trusted: boolean; backfilled: boolean };
  goals: FortuneGoal[];
  budgets: CategoryBudget[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isPro, setIsPro] = useState(initialIsPro);
  const [modal, setModal] = useState<"add" | Transaction | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // The "+ Add" tab and drawer item deep-link here as /app?add=1 so the
  // add-transaction modal is reachable from any screen.
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setModal("add");
      router.replace("/app", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (isPro || searchParams.get("checkout") !== "success") return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      const res = await fetch("/api/payments/status");
      const data = await res.json();
      if (cancelled) return;
      if (data.isPro) {
        setIsPro(true);
        setToast("Payment confirmed — you're Pro! ✨");
      } else if (attempts < 6) {
        setTimeout(poll, 1500);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [pending, startTransition] = useTransition();

  // Auto-posted captures land server-side (cron/scans) — pick them up when
  // the server component re-renders with fresh data.
  useEffect(() => setTransactions(initialTransactions), [initialTransactions]);

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

  function handleAcceptTag(id: string) {
    startTransition(async () => {
      const result = await acceptAiTag(id);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not update — please try again.");
        return;
      }
      const updated = result.data;
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    });
  }

  function handleRejectTag(id: string) {
    startTransition(async () => {
      const result = await rejectAiTag(id);
      if (result.error || !result.data) {
        setToast(result.error ?? "Could not update — please try again.");
        return;
      }
      const updated = result.data;
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    });
  }

  return (
    <AppChrome userEmail={userEmail} isPro={isPro} pendingReviewCount={pendingReviewCount}>
      <>
        <AutopilotChecklist {...setup} />
        <PulseCard
          transactions={transactions}
          balance={balance}
          pendingReviewCount={pendingReviewCount}
        />
        <FortuneGoals goals={goals} transactions={transactions} isPro={isPro} />
        <RecurringRadar transactions={transactions} isPro={isPro} />
        <InsightCard transactions={transactions} categories={categories} />
        <CategoryBreakdown transactions={transactions} categories={categories} />
        <FortuneBudget budgets={budgets} categories={categories} transactions={transactions} />
        <MonthlyOverview transactions={transactions} />

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
          provenance={provenance}
          onDetails={(t) => setDetail(t)}
          onEdit={(t) => setModal(t)}
          onDelete={handleDelete}
          deletingId={deletingId}
          onAcceptTag={handleAcceptTag}
          onRejectTag={handleRejectTag}
          tagPending={pending}
        />
      </>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              {modal === "add" ? "Add Transaction" : "Edit Transaction"}
            </h3>
            <TransactionForm
              categories={categories}
              initial={modal === "add" ? emptyFormValues(categories) : transactionToFormValues(modal)}
              submitLabel={modal === "add" ? "Add" : "Save"}
              pending={pending}
              showReceiptScan={modal === "add"}
              onCancel={() => setModal(null)}
              onSubmit={(formData) =>
                modal === "add" ? handleAdd(formData) : handleEdit(modal.id, formData)
              }
            />
          </div>
        </div>
      )}

      {detail && (
        <TransactionDetailModal
          transaction={detail}
          category={categories.find((c) => c.id === detail.category_id)}
          provenance={provenance[detail.id]}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setModal(detail);
            setDetail(null);
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </AppChrome>
  );
}
