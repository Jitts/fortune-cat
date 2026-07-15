"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BalanceAnchor, Category, CategoryBudget, FortuneGoal, FortuneSlipRow, ManualRecurringBill, SubscriptionDecision, Transaction, TransactionProvenance } from "@/lib/types";
import {
  acceptAiTag,
  addTransaction,
  deleteTransaction,
  rejectAiTag,
  updateTransaction,
} from "./actions";
import ShrineChrome, { type ShrineTab } from "./components/ShrineChrome";
import AutopilotChecklist from "./components/AutopilotChecklist";
import CatRail from "./components/CatRail";
import SlipsPanel from "./components/SlipsPanel";
import BillsDue from "./components/BillsDue";
import CashFlowBars from "./components/CashFlowBars";
import SubscriptionKillChain from "./components/SubscriptionKillChain";
import FortuneGoals from "./components/FortuneGoals";
import RecurringRadar from "./components/RecurringRadar";
import MonthlyOverview from "./components/MonthlyOverview";
import CategoryBreakdown from "./components/CategoryBreakdown";
import FortuneBudget from "./components/FortuneBudget";
import InsightCard from "./components/InsightCard";
import AnalyticsPanel from "./components/AnalyticsPanel";
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
  manualBills: initialManualBills,
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
  manualBills: ManualRecurringBill[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [manualBills, setManualBills] = useState(initialManualBills);
  const [isPro, setIsPro] = useState(initialIsPro);
  const [modal, setModal] = useState<"add" | Transaction | null>(null);
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
  const [, startBackgroundRefresh] = useTransition();

  // Auto-posted captures (email auto-scan, cron) land server-side, not through
  // our own actions — router.refresh() re-runs the server component so the
  // effect below picks up fresh data. Poll every 60s while the tab is visible
  // so the ring/ledger/bills notice new captures without a manual reload;
  // pause while hidden, and catch up immediately the moment it's focused again.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    function refresh() {
      startBackgroundRefresh(() => router.refresh());
    }
    function start() {
      if (id == null) id = setInterval(refresh, 60_000);
    }
    function stop() {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refresh();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  // Auto-posted captures land server-side (cron/scans) — pick them up when
  // the server component re-renders with fresh data.
  useEffect(() => setTransactions(initialTransactions), [initialTransactions]);
  useEffect(() => setManualBills(initialManualBills), [initialManualBills]);

  const visibleTransactions = isPro ? transactions : transactions.slice(0, FREE_TIER_LIMIT);

  // Active tab is URL-driven (?tab=…) so it deep-links and survives reload.
  const tabParam = searchParams.get("tab") as ShrineTab | null;
  const active: ShrineTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : "home";
  const setTab = (t: ShrineTab) =>
    router.replace(t === "home" ? "/app" : `/app?tab=${t}`, { scroll: false });

  const ledger = (
    <TransactionList
      transactions={visibleTransactions}
      categories={categories}
      provenance={provenance}
      onEdit={(t) => setModal(t)}
      onAcceptTag={handleAcceptTag}
      onRejectTag={handleRejectTag}
      tagPending={pending}
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
      if (result.manualBill) {
        setManualBills((prev) => [...prev, result.manualBill!]);
        setToast(`Added — and tracking "${result.manualBill.name}" in Bills 📌`);
      }
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

  const tabTitle: Record<ShrineTab, string> = {
    home: "The numbers",
    ledger: "Ledger",
    fortunes: "Fortunes",
    bills: "Bills & subscriptions",
  };

  return (
    <ShrineChrome
      active={active}
      onTab={setTab}
      onAdd={() => setModal("add")}
      userEmail={userEmail}
      isPro={isPro}
      pendingReviewCount={pendingReviewCount}
    >
      {/* Persistent 3-column shrine: the cat rail (left) and the slips + bills
          rail (right) stay put on every tab; only the centre column swaps. */}
      <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)_300px] lg:items-start">
        {/* ===== LEFT RAIL — persistent ===== */}
        <div className="order-1 space-y-6">
          <CatRail transactions={transactions} goals={goals} anchor={anchor} isPro={isPro} />
          <FortuneBudget budgets={budgets} categories={categories} transactions={transactions} />
        </div>

        {/* ===== CENTRE — swaps with the active tab ===== */}
        <div className="order-3 min-w-0 space-y-6 lg:order-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">{tabTitle[active]}</h2>
            {active === "ledger" && (
              <button
                onClick={() => setModal("add")}
                className="rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90"
              >
                + Add
              </button>
            )}
          </div>

          {active === "home" && (
            <>
              <AutopilotChecklist {...setup} />
              <CashFlowBars transactions={transactions} />
              <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                <CategoryBreakdown transactions={transactions} categories={categories} />
                <MonthlyOverview transactions={transactions} />
              </div>
            </>
          )}

          {active === "ledger" && (
            <>
              {freeNote}
              {ledger}
            </>
          )}

          {active === "fortunes" && (
            <>
              <InsightCard transactions={transactions} categories={categories} />
              <AnalyticsPanel transactions={transactions} categories={categories} isPro={isPro} />
            </>
          )}

          {active === "bills" && (
            <div className="space-y-6">
              <RecurringRadar transactions={transactions} manualBills={manualBills} isPro={isPro} />
              <SubscriptionKillChain
                transactions={transactions}
                decisions={subscriptionDecisions}
                isPro={isPro}
              />
            </div>
          )}
        </div>

        {/* ===== RIGHT RAIL — persistent ===== */}
        <div className="order-2 space-y-6 lg:order-3">
          <SlipsPanel
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            todaySlip={todaySlip}
            slipStreak={slipStreak}
          />
          <FortuneGoals goals={goals} transactions={transactions} isPro={isPro} />
          <BillsDue transactions={transactions} manualBills={manualBills} onAdd={() => setTab("bills")} />
        </div>
      </div>

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
              onDelete={
                modal === "add"
                  ? undefined
                  : () => {
                      const id = modal.id;
                      handleDelete(id);
                      setModal(null);
                    }
              }
              deleting={modal !== "add" && deletingId === modal.id}
            />
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </ShrineChrome>
  );
}
