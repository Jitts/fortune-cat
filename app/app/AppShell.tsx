"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BalanceAnchor, Category, CategoryBudget, EmailConnection, EmailTransactionCandidate, FortuneGoal, FortuneSlipRow, GoalAchievement, ManualRecurringBill, SubscriptionDecision, Transaction, TransactionProvenance } from "@/lib/types";
import {
  acceptAiTag,
  addTransaction,
  deleteTransaction,
  rejectAiTag,
  updateTransaction,
} from "./actions";
import { scanEmailInbox } from "@/app/settings/actions";
import ReviewQueue from "./components/ReviewQueue";
import ShrineChrome, { type ShrineTab } from "./components/ShrineChrome";
import AutopilotChecklist from "./components/AutopilotChecklist";
import type { PendingSender } from "@/lib/email/pendingSenders";
import CatRail from "./components/CatRail";
import SlipsPanel from "./components/SlipsPanel";
import BillsDue from "./components/BillsDue";
import CashFlowBars from "./components/CashFlowBars";
import SubscriptionKillChain from "./components/SubscriptionKillChain";
import BalanceForecast from "./components/BalanceForecast";
import FortuneGoals from "./components/FortuneGoals";
import GoalWins from "./components/GoalWins";
import RecurringRadar from "./components/RecurringRadar";
import MonthlyOverview from "./components/MonthlyOverview";
import CategoryBreakdown from "./components/CategoryBreakdown";
import FortuneBudget from "./components/FortuneBudget";
import InsightCard from "./components/InsightCard";
import AnalyticsPanel from "./components/AnalyticsPanel";
import TransactionList from "./components/TransactionList";
import EntrySheet from "./components/EntrySheet";
import { formatCurrency } from "@/lib/format";
import TransactionForm, {
  emptyFormValues,
  transactionToFormValues,
} from "./components/TransactionForm";
import Toast from "./components/Toast";
import { CurrencyProvider } from "@/app/components/CurrencyProvider";

const VALID_TABS: ShrineTab[] = ["home", "ledger", "fortunes", "bills"];

const FREE_TIER_LIMIT = 10;

export default function AppShell({
  initialTransactions,
  categories,
  isPro: initialIsPro,
  currency,
  locale,
  userEmail,
  pendingReviewCount,
  reviewCandidates,
  filteredCandidates,
  connections,
  provenance,
  setup,
  pendingSenders,
  goals,
  achievements,
  budgets,
  todaySlip,
  slipStreak,
  anchor,
  subscriptionDecisions,
  manualBills: initialManualBills,
  today,
  timezone,
}: {
  initialTransactions: Transaction[];
  categories: Category[];
  isPro: boolean;
  currency: string;
  locale: string;
  userEmail: string;
  pendingReviewCount: number;
  reviewCandidates: EmailTransactionCandidate[];
  filteredCandidates: EmailTransactionCandidate[];
  connections: EmailConnection[];
  provenance: Record<string, TransactionProvenance>;
  setup: { logged: boolean; captured: boolean; trusted: boolean; backfilled: boolean };
  /** Senders the envelope pass saw that nobody has decided about yet. */
  pendingSenders: PendingSender[];
  goals: FortuneGoal[];
  achievements: GoalAchievement[];
  budgets: CategoryBudget[];
  todaySlip: FortuneSlipRow | null;
  slipStreak: number;
  anchor: BalanceAnchor | null;
  subscriptionDecisions: SubscriptionDecision[];
  manualBills: ManualRecurringBill[];
  /** The user's local calendar date (YYYY-MM-DD, from their profile timezone). */
  today: string;
  /** The user's IANA timezone. */
  timezone: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [manualBills, setManualBills] = useState(initialManualBills);
  const [isPro, setIsPro] = useState(initialIsPro);
  const [modal, setModal] = useState<"add" | Transaction | null>(null);
  // Add and edit share ONE piece of state. Which surface renders it is decided
  // by CSS, not by measuring the viewport: mobile gets the EntrySheet, desktop
  // gets the modal form. `fullForm` is the single exception — it only flips
  // when someone explicitly taps "More options", which forces the full form up
  // on mobile too. `quickPrefill` carries the typed amount across that hop so
  // nothing entered one-handed has to be entered again.
  const [fullForm, setFullForm] = useState(false);
  const [quickPrefill, setQuickPrefill] = useState("");
  const sheetOpen = modal !== null && !fullForm;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // The desktop entry modal was a bare <div>: no dialog role, no focus move, no
  // trap, no backdrop dismiss. Every one of the 18 controls behind it stayed
  // ahead of the form in the tab order, and Esc only worked by accident —
  // through the mobile EntrySheet, which stays mounted and listening even on
  // desktop. A keyboard or screen-reader user had no way to tell the app's core
  // verb had opened. EntrySheet already does this properly; the desktop path
  // was the odd one out.
  const entryTitleId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  // Where focus came from, so it can go back there on close rather than
  // collapsing to the top of the document.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const panel = modalRef.current;
    // Both entry surfaces mount on every device and CSS picks the visible one,
    // so asking the element whether it is actually painted keeps the breakpoint
    // in one place instead of hardcoding `lg` a second time here in JS.
    if (!modal || !panel || panel.getClientRects().length === 0) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0);

    // Straight to the amount. It is the field every entry starts with, and
    // landing there is the difference between "a dialog opened" and "type".
    (panel.querySelector<HTMLElement>("input[type=number]") ?? focusable()[0])?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeEntry();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      // Wrap at both ends so Tab can never walk out into the dashboard behind.
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      returnFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, fullForm]);

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
  const [scanning, startScan] = useTransition();

  // Same on-demand scan as Capture settings, run across every connected inbox
  // in turn (one at a time — concurrent scans are avoided there too).
  function handleScanAll() {
    startScan(async () => {
      let found = 0;
      let autoPosted = 0;
      let scanned = 0;
      for (const conn of connections) {
        const result = await scanEmailInbox(conn.id);
        if ("error" in result) {
          setToast(result.error);
          return;
        }
        found += result.found;
        autoPosted += result.autoPosted;
        scanned += result.scanned;
      }
      if (found === 0) {
        setToast(`No new transactions found (scanned ${scanned} emails).`);
      } else {
        const parts = [`Found ${found} new transaction${found === 1 ? "" : "s"}`];
        if (autoPosted > 0) parts.push(`${autoPosted} auto-posted ⚡`);
        if (found - autoPosted > 0) parts.push(`${found - autoPosted} waiting for review`);
        setToast(`${parts.join(" · ")} (from ${scanned} emails).`);
      }
      router.refresh();
    });
  }

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
      today={today}
      onEdit={(t) => {
        setQuickPrefill("");
        setFullForm(false);
        setModal(t);
      }}
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
      } else if (sheetOpen) {
        // The sheet covers the ledger on mobile, so confirm the save in words.
        setToast(
          `Added ${created.type === "income" ? "+" : ""}${formatCurrency(created.amount, currency, locale)} ✓`,
        );
      }
      closeEntry();
    });
  }

  /** Dismiss whichever surface is open and forget the hand-off state. */
  function closeEntry() {
    setModal(null);
    setFullForm(false);
    setQuickPrefill("");
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
      if (sheetOpen) {
        setToast(
          `Saved ${updated.type === "income" ? "+" : ""}${formatCurrency(updated.amount, currency, locale)} ✓`,
        );
      }
      closeEntry();
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
    <CurrencyProvider currency={currency} locale={locale} timezone={timezone}>
    <ShrineChrome
      active={active}
      onTab={setTab}
      onAdd={() => {
        setQuickPrefill("");
        setFullForm(false);
        setModal("add");
      }}
      userEmail={userEmail}
      isPro={isPro}
      pendingReviewCount={pendingReviewCount}
    >
      {/* Persistent 3-column shrine: the cat rail (left) and the slips + bills
          rail (right) stay put on every tab; only the centre column swaps. */}
      <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)_300px] lg:items-start">
        {/* ===== LEFT RAIL — persistent, desktop only (mobile folds the cat
            into Home and the budget into Fortunes, so tabs open on their own
            content instead of a wall of rails) ===== */}
        <div className="hidden space-y-6 lg:block">
          <CatRail transactions={transactions} goals={goals} anchor={anchor} isPro={isPro} timezone={timezone} />
          <FortuneBudget budgets={budgets} categories={categories} transactions={transactions} />
        </div>

        {/* ===== CENTRE — swaps with the active tab ===== */}
        <div className="min-w-0 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink">{tabTitle[active]}</h2>
            {active === "ledger" && (
              <div className="flex items-center gap-2">
                {connections.length > 0 && (
                  <button
                    onClick={handleScanAll}
                    disabled={scanning}
                    title="Scan your connected inboxes for new transactions now"
                    className="rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90 disabled:opacity-50"
                  >
                    {scanning ? "Scanning…" : "Scan now"}
                  </button>
                )}
                <button
                  onClick={() => setModal("add")}
                  className="rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90"
                >
                  + Add
                </button>
              </div>
            )}
          </div>

          {active === "home" && (
            <>
              {/* Ahead of the cat rail on mobile. On a phone that rail is a
                  ~400px block holding a luck ring with nothing yet to report
                  and a Go Pro button, and burying the first-run guidance under
                  it is a large part of why new users asked what they were
                  meant to do here. Desktop is unaffected — the rail lives in
                  the left column there, not in this stack. */}
              <AutopilotChecklist
                {...setup}
                onLogFirst={() => {
                  setQuickPrefill("");
                  setFullForm(false);
                  setModal("add");
                }}
              />
              <div className="lg:hidden">
                <CatRail transactions={transactions} goals={goals} anchor={anchor} isPro={isPro} timezone={timezone} />
              </div>
              <CashFlowBars transactions={transactions} timezone={timezone} />
              <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                <CategoryBreakdown transactions={transactions} categories={categories} />
                <MonthlyOverview transactions={transactions} />
              </div>
            </>
          )}

          {active === "ledger" && (
            <>
              {freeNote}
              <ReviewQueue
                initialCandidates={reviewCandidates}
                initialFiltered={filteredCandidates}
                pendingSenders={pendingSenders}
              />
              {ledger}
            </>
          )}

          {active === "fortunes" && (
            <>
              <div className="space-y-6 lg:hidden">
                <SlipsPanel
                  transactions={transactions}
                  categories={categories}
                  budgets={budgets}
                  todaySlip={todaySlip}
                  slipStreak={slipStreak}
                />
                <FortuneGoals goals={goals} achievements={achievements} transactions={transactions} isPro={isPro} />
                <FortuneBudget budgets={budgets} categories={categories} transactions={transactions} />
              </div>
              <BalanceForecast
                transactions={transactions}
                manualBills={manualBills}
                anchor={anchor}
                isPro={isPro}
              />
              <InsightCard transactions={transactions} categories={categories} />
              <AnalyticsPanel transactions={transactions} categories={categories} isPro={isPro} />
              <GoalWins achievements={achievements} isPro={isPro} />
            </>
          )}

          {active === "bills" && (
            <div className="space-y-6">
              <div className="lg:hidden">
                <BillsDue transactions={transactions} manualBills={manualBills} onAdd={() => setTab("bills")} />
              </div>
              <RecurringRadar transactions={transactions} manualBills={manualBills} isPro={isPro} today={today} />
              <SubscriptionKillChain
                transactions={transactions}
                decisions={subscriptionDecisions}
                isPro={isPro}
              />
            </div>
          )}
        </div>

        {/* ===== RIGHT RAIL — persistent, desktop only (mobile folds slips +
            goals into Fortunes and bills-due into Bills) ===== */}
        <div className="hidden space-y-6 lg:block">
          <SlipsPanel
            transactions={transactions}
            categories={categories}
            budgets={budgets}
            todaySlip={todaySlip}
            slipStreak={slipStreak}
          />
          <FortuneGoals goals={goals} achievements={achievements} transactions={transactions} isPro={isPro} />
          <BillsDue transactions={transactions} manualBills={manualBills} onAdd={() => setTab("bills")} />
        </div>
      </div>

      {/* Adding and editing are the same job, so they share one state and one
          look per device. The modal is desktop-only UNLESS someone explicitly
          asked for every field via "More options" — then it comes up on mobile
          too, which is the only case where JS, not CSS, decides. */}
      {modal && (
        <div
          className={`fixed inset-0 z-40 items-center justify-center bg-black/30 p-4 ${
            fullForm ? "flex" : "hidden lg:flex"
          }`}
          // Clicking the backdrop leaves. The panel stops the event so a click
          // inside it never counts as a click outside.
          onClick={closeEntry}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={entryTitleId}
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 id={entryTitleId} className="text-lg font-semibold text-ink">
                {modal === "add" ? "Add Transaction" : "Edit Transaction"}
              </h3>
              <button
                type="button"
                onClick={closeEntry}
                aria-label="Close"
                className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-subtle transition hover:bg-surface-3 hover:text-ink"
              >
                <span aria-hidden className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
            <TransactionForm
              categories={categories}
              initial={
                modal === "add"
                  ? { ...emptyFormValues(categories), date: today, amount: quickPrefill }
                  : // Carry a keypad amount across on the EDIT hop as well, or
                    // "More options" would silently discard what was just typed.
                    {
                      ...transactionToFormValues(modal),
                      ...(quickPrefill ? { amount: quickPrefill } : {}),
                    }
              }
              submitLabel={modal === "add" ? "Add" : "Save"}
              pending={pending}
              showReceiptScan={modal === "add"}
              onCancel={closeEntry}
              onSubmit={(formData) =>
                modal === "add" ? handleAdd(formData) : handleEdit(modal.id, formData)
              }
              onDelete={
                modal === "add"
                  ? undefined
                  : () => {
                      handleDelete(modal.id);
                      closeEntry();
                    }
              }
              deleting={modal !== "add" && deletingId === modal.id}
            />
          </div>
        </div>
      )}

      {sheetOpen && (
        <EntrySheet
          editing={modal === "add" ? null : modal}
          categories={categories}
          transactions={transactions}
          today={today}
          pending={pending}
          deleting={modal !== "add" && deletingId === modal.id}
          onSubmit={(formData) =>
            modal === "add" ? handleAdd(formData) : handleEdit(modal.id, formData)
          }
          onDelete={
            modal === "add"
              ? undefined
              : () => {
                  handleDelete(modal.id);
                  closeEntry();
                }
          }
          onClose={closeEntry}
          onMoreOptions={(amount) => {
            setQuickPrefill(amount);
            setFullForm(true);
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </ShrineChrome>
    </CurrencyProvider>
  );
}
