"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { analyzeRecurring } from "@/lib/recurring";
import { formatCurrency } from "@/lib/format";
import { addManualBill, deleteManualBill } from "../manualBillActions";
import type { ManualRecurringBill, Transaction } from "@/lib/types";

function dueLabel(daysUntil: number, nextDate: string): string {
  const date = new Date(`${nextDate}T00:00:00`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
  if (daysUntil < 0) return `${date} · overdue`;
  if (daysUntil === 0) return `${date} · today`;
  if (daysUntil === 1) return `${date} · tomorrow`;
  return `${date} · in ${daysUntil} days`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bills the radar hasn't (or can't) detect yet — always available, any tier,
 * since this is plain data entry rather than the radar's "intelligence".
 */
function ManualBillsSection({ manualBills: initial }: { manualBills: ManualRecurringBill[] }) {
  const [manualBills, setManualBills] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<"monthly" | "weekly">("monthly");
  const [nextDueDate, setNextDueDate] = useState(todayIso());
  const [accountTag, setAccountTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setName("");
    setAmount("");
    setCadence("monthly");
    setNextDueDate(todayIso());
    setAccountTag("");
  }

  function handleAdd() {
    const amt = Number(amount);
    if (!name.trim()) {
      setError("Give it a name.");
      return;
    }
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!nextDueDate) {
      setError("Choose the next due date.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("amount", amount);
    formData.set("cadence", cadence);
    formData.set("type", "expense");
    formData.set("next_due_date", nextDueDate);
    formData.set("account_tag", accountTag.trim());
    startTransition(async () => {
      const result = await addManualBill(formData);
      if (result.error || !result.data) {
        setError(result.error ?? "Could not save — please try again.");
        return;
      }
      setManualBills((prev) => [...prev, result.data]);
      setAdding(false);
      resetForm();
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteManualBill(id);
      setDeletingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setManualBills((prev) => prev.filter((b) => b.id !== id));
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-ink-subtle">📌 Your recurring bills</h2>
        {!adding && (
          <button
            onClick={() => {
              setError(null);
              setAdding(true);
            }}
            className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-white hover:bg-action/90"
          >
            + Add a bill
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {adding && (
        <div className="mt-3 space-y-2 rounded-lg bg-surface-2 p-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home loan, Telco bill"
              autoFocus
              className="min-w-[160px] flex-1 rounded-lg border border-line px-2 py-1.5 text-sm focus:border-fortune-400 focus:outline-none"
            />
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-28 rounded-lg border border-line px-2 py-1.5 text-sm [font-variant-numeric:tabular-nums] focus:border-fortune-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as "monthly" | "weekly")}
              className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-fortune-400 focus:outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-fortune-400 focus:outline-none"
            />
            <input
              value={accountTag}
              onChange={(e) => setAccountTag(e.target.value)}
              placeholder="GIRO / card (optional)"
              className="min-w-[140px] flex-1 rounded-lg border border-line px-2 py-1.5 text-sm focus:border-fortune-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={pending}
              className="rounded-lg bg-fortune-400 px-3 py-1.5 text-xs font-semibold text-fortune-700 hover:brightness-95 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
              className="text-xs text-ink-faint hover:text-ink-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {manualBills.length > 0 ? (
        <ul className="mt-3 divide-y divide-line">
          {manualBills.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{b.name}</p>
                <p className="text-xs text-ink-subtle">
                  every {b.cadence} · next{" "}
                  {new Date(`${b.next_due_date}T00:00:00`).toLocaleDateString("en-SG", {
                    day: "numeric",
                    month: "short",
                  })}
                  {b.account_tag ? ` · ${b.account_tag}` : ""}
                </p>
              </div>
              <span
                className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                  b.type === "income" ? "text-emerald-700" : "text-ink"
                }`}
              >
                {b.type === "income" ? "+" : "−"}
                {formatCurrency(b.amount)}
              </span>
              <button
                onClick={() => handleDelete(b.id)}
                disabled={deletingId === b.id}
                className="text-xs font-medium text-ink-faint hover:text-red-600 disabled:opacity-50"
              >
                {deletingId === b.id ? "…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !adding && (
          <p className="mt-2 text-xs text-ink-subtle">
            Nothing entered yet — add a bill the radar hasn&apos;t caught, like a home loan or a
            telco plan.
          </p>
        )
      )}
    </div>
  );
}

/**
 * The forward-looking card: your own manually-tracked bills (always
 * available), plus recurring flows the radar detected from captured history
 * and anything that deserves attention — the detected half stays a Pro
 * feature, mirroring the rest of the app's free/Pro split.
 */
export default function RecurringRadar({
  transactions,
  manualBills,
  isPro,
}: {
  transactions: Transaction[];
  manualBills: ManualRecurringBill[];
  isPro: boolean;
}) {
  const { upcoming, alerts } = useMemo(() => analyzeRecurring(transactions), [transactions]);
  const hasDetected = upcoming.length > 0 || alerts.length > 0;

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <ManualBillsSection manualBills={manualBills} />

      <div className="mt-5 border-t border-line pt-5">
        {!isPro ? (
          hasDetected ? (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-ink-subtle">🔭 Recurring radar</h3>
                <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
                  PRO
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                The radar has learned your rhythms:{" "}
                <b>
                  {upcoming.length} flow{upcoming.length === 1 ? "" : "s"} due in the next 14 days
                </b>
                {alerts.length > 0 && (
                  <>
                    {" "}
                    and{" "}
                    <b className="text-red-600">
                      {alerts.length} thing{alerts.length === 1 ? "" : "s"} to check
                    </b>
                  </>
                )}
                .
              </p>
              <Link
                href="/upgrade"
                className="mt-3 inline-block rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90"
              >
                Go Pro to see what&apos;s coming
              </Link>
            </>
          ) : (
            <p className="text-xs text-ink-faint">
              Keep capturing — the radar will start spotting rhythms in your ledger automatically.
            </p>
          )
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-ink-subtle">🔭 Coming up · next 14 days</h3>
              <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
                PRO
              </span>
            </div>

            {upcoming.length > 0 ? (
              <ul className="mt-3 divide-y divide-line">
                {upcoming.map((f) => (
                  <li key={f.key} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{f.name}</p>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-subtle">
                        <span>{dueLabel(f.daysUntil, f.nextDate)}</span>
                        <span className="rounded-full bg-surface-3 px-1.5 py-px font-mono text-[10px] text-ink-subtle">
                          {f.cadence}
                        </span>
                        {f.biller && (
                          <span className="rounded-full bg-surface-3 px-1.5 py-px font-mono text-[10px] text-ink-subtle">
                            ↻ biller
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                        f.type === "income" ? "text-emerald-700" : "text-ink"
                      }`}
                    >
                      {f.type === "income" ? "+" : "−"}~{formatCurrency(f.expectedAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-subtle">Nothing detected due in the next two weeks.</p>
            )}

            {alerts.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                  Needs attention
                </p>
                <ul className="mt-1 space-y-1.5">
                  {alerts.map((a, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className={a.kind === "new_biller" ? "text-amber-700" : "text-red-600"}>
                        {a.kind === "new_biller" ? "◍ " : "! "}
                        {a.message}
                      </span>
                      <span className="shrink-0 font-semibold text-ink [font-variant-numeric:tabular-nums]">
                        −{formatCurrency(a.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-[11px] text-ink-faint">
              Learned from your captured history — rules only, nothing leaves your ledger.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
