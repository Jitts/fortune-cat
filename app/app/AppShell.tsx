"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BalanceAnchor, Category, CategoryBudget, FortuneGoal, FortuneSlipRow, SubscriptionDecision, Transaction, TransactionProvenance } from "@/lib/types";
import {
  acceptAiTag,
  addTransaction,
  deleteTransaction,
  rejectAiTag,
  updateTransaction,
} from "./actions";
import { formatCurrency } from "@/lib/format";
import { monthPulse } from "@/lib/monthPulse";
import ShrineChrome, { type ShrineTab } from "./components/ShrineChrome";
import AutopilotChecklist from "./components/AutopilotChecklist";
import CatRail from "./components/CatRail";
import SlipsPanel from "./components/SlipsPanel";
import BillsDue from "./components/BillsDue";
import CashFlowBars from "./components/CashFlowBars";
import SubscriptionKillChain from "./components/SubscriptionKillChain";
import TransactionDetailModal from "./components/TransactionDetailModal";
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

const VALID_TABS: ShrineTab[] = ["home", "ledger", "fortunes", "bills"];

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
  todaySlip,
  slipStreak,
  anchor,
  subscriptionDecisions,
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
  todaySlip: FortuneSlipRow | null;
  slipStreak: number;
  anchor: BalanceAnchor | null;
  subscriptionDecisions: SubscriptionDecision[];
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

  const visibleTransactions = isPro ? transactions : transactions.slice(0, FREE_TIER_LIMIT);

  // Active tab is URL-driven (?tab=…) so it deep-links and survives reload.
  const tabParam = searchParams.get("tab") as ShrineTab | null;
  const active: ShrineTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "home";
  const setTab = (t: ShrineTab) =>
    router.replace(t === "home" ? "/app" : `/app?tab=${t}`, { scroll: false });

  const monthName = new Date().toLocaleDateString("en-SG", { month: "long" });
  const monthNet = useMemo(() => monthPulse(transactions).net, [transactions]);

  const ledgerHeading = (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold text-ink">{monthName} ledger</h2>
      <span
        className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
          monthNet >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {monthNet >= 0 ? "+" : "−"}
        {formatCurrency(Math.abs(monthNet))}
      </span>
    </div>
  );

  const renderLedger = (maxDays?: number, hideMonthHeader = false) => (
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
      maxDays={maxDays}
      hideMonthHeader={hideMonthHeader}
    />
  );

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

  const freeNote = !isPro && transactions.length > FREE_TIER_LIMIT && (
    <p className="text-xs text-ink-faint">
      Showing your {FREE_TIER_LIMIT} most recent transactions.{" "}
      <Link href="/upgrade" className="underline hover:text-ink-muted">
        Go Pro
      </Link>{" "}
      to see full history.
    </p>
  );

  return (
    <ShrineChrome
      active={active}
      onTab={setTab}
      onAdd={() => setModal("add")}
      userEmail={userEmail}
      isPro={isPro}
      pendingReviewCount={pendingReviewCount}
    >
      {/* ===== HOME — the 3-column shrine ===== */}
      {active === "home" && (
        <div className="space-y-6">
          <AutopilotChecklist {...setup} />
          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:items-start">
            <div className="order-1">
              <CatRail transactions={transactions} goals={goals} anchor={anchor} isPro={isPro} />
            </div>
            <div className="order-3 space-y-3 lg:order-2">
              {ledgerHeading}
              {renderLedger(4, true)}
              <button
                onClick={() => setTab("ledger")}
                className="text-xs font-medium text-ink-subtle underline hover:text-ink-muted"
              >
                View full ledger →
              </button>
            </div>
            <div className="order-2 lg:order-3">
              <SlipsPanel
                transactions={transactions}
                categories={categories}
                budgets={budgets}
                todaySlip={todaySlip}
                slipStreak={slipStreak}
              />
              <div className="mt-6">
                <BillsDue transactions={transactions} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== LEDGER ===== */}
      {active === "ledger" && (
        <div className="space-y-6">
          <CashFlowBars transactions={transactions} />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">All transactions</h2>
            <button
              onClick={() => setModal("add")}
              className="rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90"
            >
              + Add
            </button>
          </div>
          {freeNote}
          {renderLedger()}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <CategoryBreakdown transactions={transactions} categories={categories} />
            <MonthlyOverview transactions={transactions} />
          </div>
        </div>
      )}

      {/* ===== FORTUNES ===== */}
      {active === "fortunes" && (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <SlipsPanel
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            todaySlip={todaySlip}
            slipStreak={slipStreak}
          />
          <div className="space-y-6">
            <InsightCard transactions={transactions} categories={categories} />
            <FortuneGoals goals={goals} transactions={transactions} isPro={isPro} />
          </div>
        </div>
      )}

      {/* ===== BILLS ===== */}
      {active === "bills" && (
        <div className="space-y-6">
          <BillsDue transactions={transactions} limit={20} />
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <RecurringRadar transactions={transactions} isPro={isPro} />
            <SubscriptionKillChain
              transactions={transactions}
              decisions={subscriptionDecisions}
              isPro={isPro}
            />
            <FortuneBudget budgets={budgets} categories={categories} transactions={transactions} />
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-ink">
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
    </ShrineChrome>
  );
}
