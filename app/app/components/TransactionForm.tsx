"use client";

import { useState } from "react";
import type { Category, Transaction, TransactionType } from "@/lib/types";
import { suggestCategory } from "@/lib/tagger";
import ReceiptScanButton from "./ReceiptScanButton";
import type { ReceiptParse } from "@/lib/receipt/parseReceipt";

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  category_id: string;
  date: string;
  note: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyFormValues(categories: Category[]): TransactionFormValues {
  return {
    type: "expense",
    amount: "",
    category_id: categories[0]?.id ?? "",
    date: todayIso(),
    note: "",
  };
}

export function transactionToFormValues(t: Transaction): TransactionFormValues {
  return {
    type: t.type,
    amount: String(t.amount),
    category_id: t.category_id ?? "",
    date: t.date,
    note: t.note ?? "",
  };
}

export default function TransactionForm({
  categories,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  deleting = false,
  pending,
  showReceiptScan = false,
}: {
  categories: Category[];
  initial: TransactionFormValues;
  submitLabel: string;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  // Edit mode only: renders a Delete button that removes this transaction.
  onDelete?: () => void;
  deleting?: boolean;
  pending: boolean;
  showReceiptScan?: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [markRecurring, setMarkRecurring] = useState(false);
  const [recurringCadence, setRecurringCadence] = useState<"monthly" | "weekly">("monthly");

  // Only offered on the Add flow (not Edit) and only for expenses — a quick
  // enrollment shortcut so a fresh subscription shows up in Bills Due right
  // away instead of waiting for the radar to trust it over several cycles.
  const showRecurringOption = submitLabel === "Add" && values.type === "expense";

  // Prefill from a scanned receipt: amount, note (merchant), date, and a best-
  // guess category inferred from the merchant name.
  function applyReceipt(p: ReceiptParse) {
    setValues((v) => {
      const next = { ...v, type: "expense" as TransactionType };
      if (p.amount != null) next.amount = p.amount.toFixed(2);
      if (p.merchant) next.note = p.merchant;
      if (p.date) next.date = p.date;
      const guess = p.merchant ? suggestCategory(p.merchant, "expense") : null;
      if (guess) {
        const match = categories.find((c) => c.name === guess.category);
        if (match) next.category_id = match.id;
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(values.amount);
    if (!values.amount || Number.isNaN(amount) || amount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!values.category_id) {
      setError("Choose a category.");
      return;
    }
    if (!values.date) {
      setError("Choose a date.");
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set("type", values.type);
    formData.set("amount", values.amount);
    formData.set("category_id", values.category_id);
    formData.set("date", values.date);
    formData.set("note", values.note);
    if (showRecurringOption && markRecurring) {
      formData.set("mark_recurring", "1");
      formData.set("recurring_cadence", recurringCadence);
    }
    onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showReceiptScan && <ReceiptScanButton onParsed={applyReceipt} />}

      <div className="flex gap-2">
        {(["expense", "income"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setValues((v) => ({ ...v, type }))}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
              values.type === type
                ? type === "expense"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-line text-ink-subtle hover:bg-surface-2"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={values.amount}
          onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
          placeholder="0.00"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-line focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted">Category</label>
        <select
          value={values.category_id}
          onChange={(e) => setValues((v) => ({ ...v, category_id: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-line focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted">Date</label>
        <input
          type="date"
          value={values.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-line focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-muted">Note (optional)</label>
        <input
          type="text"
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          placeholder="Lunch with Alex"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-line focus:outline-none"
        />
      </div>

      {showRecurringOption && (
        <div className="rounded-lg bg-surface-2 p-3">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={markRecurring}
              onChange={(e) => setMarkRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-line text-action focus:ring-action"
            />
            This is a recurring bill (subscription, loan, telco…)
          </label>
          {markRecurring && (
            <div className="mt-2 flex items-center gap-2 pl-6">
              <span className="text-xs text-ink-subtle">Repeats</span>
              <select
                value={recurringCadence}
                onChange={(e) => setRecurringCadence(e.target.value as "monthly" | "weekly")}
                className="rounded-lg border border-line px-2 py-1 text-xs focus:border-fortune-400 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
              <span className="text-xs text-ink-faint">
                — shows up in Bills Due right away instead of waiting on the radar
              </span>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || pending}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90 disabled:opacity-50"
          >
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
