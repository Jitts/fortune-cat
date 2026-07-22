"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMoney } from "@/app/components/CurrencyProvider";
import type { FortuneGoal, GoalAchievement, Transaction } from "@/lib/types";
import { createGoal, updateGoal, contributeToGoal, deleteGoal } from "../goalActions";
import Daruma from "./Daruma";
import CoinGlyph from "@/app/components/CoinGlyph";

/** Average monthly expense from history — powers the emergency-fund target. */
function avgMonthlyExpense(transactions: Transaction[]): number {
  const byMonth = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const key = t.date.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + t.amount);
  }
  if (byMonth.size === 0) return 0;
  const total = [...byMonth.values()].reduce((a, b) => a + b, 0);
  return total / byMonth.size;
}

function GoalBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.max(3, Math.min(100, pct))}%`,
          // gold→red energy gradient per design/DESIGN.md progress bars
          background: "linear-gradient(90deg, #ffd700 0%, #f0a341 60%, #db313f 100%)",
        }}
      />
    </div>
  );
}

type Draft = {
  id?: string;
  name: string;
  kind: "savings" | "emergency";
  target_amount: string;
  saved_amount: string;
  target_date: string;
};

const emptyDraft: Draft = {
  name: "",
  kind: "savings",
  target_amount: "",
  saved_amount: "",
  target_date: "",
};

export default function FortuneGoals({
  goals,
  achievements,
  transactions,
  isPro,
}: {
  goals: FortuneGoal[];
  achievements: GoalAchievement[];
  transactions: Transaction[];
  isPro: boolean;
}) {
  const router = useRouter();
  const { format } = useMoney();
  const [items, setItems] = useState(goals);
  // Reconcile with server data after a router.refresh() — e.g. once a reached
  // goal has been banked as a win and should drop off the active list.
  useEffect(() => setItems(goals), [goals]);
  // Goals already recorded as wins leave the active list (they live in the
  // Fortune wins panel). Keyed off the achievements ledger, not a raw
  // saved ≥ target check, so a goal never disappears unless the win truly
  // recorded — which keeps it safe if the migration hasn't been applied yet.
  const achievedGoalIds = useMemo(
    () => new Set(achievements.map((a) => a.goal_id).filter((x): x is string => !!x)),
    [achievements],
  );
  const [modal, setModal] = useState<Draft | null>(null);
  const [boostId, setBoostId] = useState<string | null>(null);
  const [boostAmount, setBoostAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const monthlyExpense = useMemo(() => avgMonthlyExpense(transactions), [transactions]);
  const recommendedEmergency = Math.round(monthlyExpense * 6);

  // Free users see a teaser only (consistent with the recurring radar).
  if (!isPro) {
    return (
      <div className="rounded-2xl border-t-2 border-gold bg-surface p-6 shadow-sm ring-1 ring-line">
        <div className="flex items-center gap-2">
          <CoinGlyph size={17} />
          <h2 className="text-sm font-medium text-ink-subtle">Fortune Goals</h2>
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-gold-text">
            PRO
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          Set a goal — a holiday, a home deposit, or an emergency fund — and watch it fill up as you
          save. For an emergency fund, the cat sizes the target to your real spending
          {monthlyExpense > 0 && (
            <>
              {" "}
              (<b>~{format(recommendedEmergency)}</b>, six months of your ~
              {format(monthlyExpense)}/mo)
            </>
          )}
          .
        </p>
        <Link
          href="/upgrade"
          className="mt-3 inline-block rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90"
        >
          Go Pro to set goals
        </Link>
      </div>
    );
  }

  function openAdd(kind: "savings" | "emergency") {
    setError(null);
    if (kind === "emergency") {
      setModal({
        ...emptyDraft,
        kind: "emergency",
        name: "Emergency fund",
        target_amount: recommendedEmergency > 0 ? String(recommendedEmergency) : "",
      });
    } else {
      setModal({ ...emptyDraft });
    }
  }

  function openEdit(g: FortuneGoal) {
    setError(null);
    setModal({
      id: g.id,
      name: g.name,
      kind: g.kind,
      target_amount: String(g.target_amount),
      saved_amount: String(g.saved_amount),
      target_date: g.target_date ?? "",
    });
  }

  function submitModal() {
    if (!modal) return;
    const fd = new FormData();
    fd.set("name", modal.name);
    fd.set("kind", modal.kind);
    fd.set("target_amount", modal.target_amount);
    fd.set("saved_amount", modal.saved_amount || "0");
    fd.set("target_date", modal.target_date);

    startTransition(async () => {
      const result = modal.id ? await updateGoal(modal.id, fd) : await createGoal(fd);
      if (result.error || !result.data) {
        setError(result.error ?? "Could not save.");
        return;
      }
      const saved = result.data;
      setItems((prev) =>
        modal.id ? prev.map((g) => (g.id === saved.id ? saved : g)) : [...prev, saved],
      );
      setModal(null);
      if (saved.saved_amount >= saved.target_amount) router.refresh();
    });
  }

  function submitBoost(id: string) {
    const amount = Number(boostAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      setError("Enter an amount to add.");
      return;
    }
    startTransition(async () => {
      const result = await contributeToGoal(id, amount);
      if (result.error || !result.data) {
        setError(result.error ?? "Could not update.");
        return;
      }
      const saved = result.data;
      setItems((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
      setBoostId(null);
      setBoostAmount("");
      // Reached the target? Pull fresh server data so the new win records and
      // the goal moves out of the active list into Fortune wins.
      if (saved.saved_amount >= saved.target_amount) router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteGoal(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((g) => g.id !== id));
    });
  }

  const hasEmergency = items.some((g) => g.kind === "emergency");
  const activeItems = items.filter((g) => !achievedGoalIds.has(g.id));

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CoinGlyph size={17} />
          <h2 className="text-sm font-medium text-ink-subtle">Fortune Goals</h2>
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-gold-text">
            PRO
          </span>
        </div>
        <button
          onClick={() => openAdd("savings")}
          className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-white hover:bg-action/90"
        >
          + New goal
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-vermilion">{error}</p>}

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl bg-surface-2 p-5 text-center">
          <p className="text-sm text-ink-muted">
            No goals yet. Start with an emergency fund — the cat will size it to your spending.
          </p>
          <button
            onClick={() => openAdd("emergency")}
            className="btn btn-gold mt-3 px-4 py-2 text-sm"
          >
            Start an emergency fund
            {recommendedEmergency > 0 && <> · {format(recommendedEmergency)}</>}
          </button>
        </div>
      ) : activeItems.length === 0 ? (
        <div className="mt-4 rounded-xl bg-surface-2 p-5 text-center">
          <p className="text-sm text-ink-muted">
            🎉 Every goal reached — they&apos;re banked in <b>Fortune wins</b>. Set a new one to
            keep the momentum going.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-4">
          {activeItems.map((g) => {
            const pct = g.target_amount > 0 ? (g.saved_amount / g.target_amount) * 100 : 0;
            const done = g.saved_amount >= g.target_amount;
            const remaining = Math.max(0, g.target_amount - g.saved_amount);
            return (
              <li key={g.id} className="rounded-xl ring-1 ring-line p-4">
                <div className="flex items-start gap-3">
                  <Daruma progress={pct / 100} size={40} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          {g.name}
                          {done && (
                            <span className="rounded-full bg-jade-soft px-1.5 py-px font-mono text-[10px] text-jade">
                              ✓ reached
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-subtle [font-variant-numeric:tabular-nums]">
                          {format(g.saved_amount)} of {format(g.target_amount)}
                          {g.target_date && (
                            <> · by {new Date(`${g.target_date}T00:00:00`).toLocaleDateString("en-SG", { month: "short", year: "numeric" })}</>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold text-gold-text [font-variant-numeric:tabular-nums]">
                        {Math.round(pct)}%
                      </span>
                    </div>

                    <GoalBar pct={pct} />

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-ink-faint [font-variant-numeric:tabular-nums]">
                        {done ? "Fully funded — nice work." : `${format(remaining)} to go`}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => {
                            setError(null);
                            setBoostId(boostId === g.id ? null : g.id);
                            setBoostAmount("");
                          }}
                          className="font-medium text-gold-text hover:underline"
                        >
                          Boost
                        </button>
                        <button
                          onClick={() => openEdit(g)}
                          className="font-medium text-ink-subtle hover:text-ink"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(g.id)}
                          disabled={pending}
                          className="font-medium text-ink-faint hover:text-vermilion disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {boostId === g.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-ink-subtle">Add</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          autoFocus
                          value={boostAmount}
                          onChange={(e) => setBoostAmount(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && submitBoost(g.id)}
                          placeholder="100"
                          className="w-24 rounded-lg border border-line px-2 py-1 text-sm [font-variant-numeric:tabular-nums] focus:border-gold focus:outline-none"
                        />
                        <button
                          onClick={() => submitBoost(g.id)}
                          disabled={pending}
                          className="btn btn-gold px-3 py-1 text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setBoostId(null)}
                          className="text-xs text-ink-faint hover:text-ink-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && !hasEmergency && (
        <button
          onClick={() => openAdd("emergency")}
          className="mt-3 text-xs font-medium text-gold-text hover:underline"
        >
          + Add an emergency fund{recommendedEmergency > 0 && <> ({format(recommendedEmergency)} recommended)</>}
        </button>
      )}

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ink">
              {modal.id ? "Edit goal" : modal.kind === "emergency" ? "Emergency fund" : "New Fortune Goal"}
            </h3>

            {modal.kind === "emergency" && !modal.id && (
              <p className="mt-1 text-xs text-ink-subtle">
                {monthlyExpense > 0
                  ? `Recommended: ${format(recommendedEmergency)} — six months of your ~${format(monthlyExpense)}/mo spending. Adjust to taste.`
                  : "Aim for three to six months of expenses. Adjust as your spending history grows."}
              </p>
            )}

            {error && <p className="mt-2 text-xs text-vermilion">{error}</p>}

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Name</span>
                <input
                  value={modal.name}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                  placeholder="Orient cruise, home deposit…"
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Target amount</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={modal.target_amount}
                  onChange={(e) => setModal({ ...modal, target_amount: e.target.value })}
                  placeholder="15000"
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm [font-variant-numeric:tabular-nums] focus:border-gold focus:outline-none"
                />
              </label>
              {!modal.id && (
                <label className="block">
                  <span className="text-xs font-medium text-ink-muted">Already saved (optional)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={modal.saved_amount}
                    onChange={(e) => setModal({ ...modal, saved_amount: e.target.value })}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm [font-variant-numeric:tabular-nums] focus:border-gold focus:outline-none"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs font-medium text-ink-muted">Target date (optional)</span>
                <input
                  type="date"
                  value={modal.target_date}
                  onChange={(e) => setModal({ ...modal, target_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-gold focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted ring-1 ring-line hover:bg-surface-3"
              >
                Cancel
              </button>
              <button
                onClick={submitModal}
                disabled={pending}
                className="rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90 disabled:opacity-50"
              >
                {pending ? "Saving…" : modal.id ? "Save" : "Create goal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
