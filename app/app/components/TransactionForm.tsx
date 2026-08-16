"use client";

import { useId, useState } from "react";
import type { Category, Transaction, TransactionType } from "@/lib/types";
import { suggestCategory } from "@/lib/tagger";
import ReceiptScanButton from "./ReceiptScanButton";
import AmountKeypadSheet from "./AmountKeypadSheet";
import type { ReceiptParse } from "@/lib/receipt/parseReceipt";

export type TransactionFormValues = {
  type: TransactionType;
  amount: string;
  category_id: string;
  date: string;
  note: string;
};

/**
 * A blank entry, pre-dated to the user's own day. `today` is required: the old
 * default was `new Date().toISOString()`, which is the UTC day — for a reader
 * east of UTC that pre-fills yesterday for the first hours of their morning.
 * The one caller already overrode it, so the default only ever waited to catch
 * the next one.
 */
export function emptyFormValues(
  categories: Category[],
  today: string,
): TransactionFormValues {
  return {
    type: "expense",
    amount: "",
    category_id: categories[0]?.id ?? "",
    date: today,
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
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [markRecurring, setMarkRecurring] = useState(false);
  const [recurringCadence, setRecurringCadence] = useState<"monthly" | "weekly">("monthly");

  // Every field needs an id its label can point at. These were sibling <label>
  // elements with no htmlFor, so a screen reader announced the amount input as
  // `textbox "0.00"` and the category as its first option — no field name at
  // all, on the app's core verb. useId because both entry surfaces mount at
  // once (CSS decides which is visible), so a hand-written id would collide.
  const formId = useId();
  const amountId = `${formId}-amount`;
  const categoryId = `${formId}-category`;
  const dateId = `${formId}-date`;
  const noteId = `${formId}-note`;

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
                  ? "border-vermilion bg-vermilion-soft text-vermilion"
                  : "border-jade bg-jade-soft text-jade"
                : "border-line text-ink-subtle hover:bg-surface-2"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor={amountId} className="block text-sm font-medium text-ink-muted">
          Amount
        </label>
        {/* On a phone, tapping the amount opens the keypad with the calculator
            rather than the OS number pad — correcting a captured row is usually
            done against a receipt with several lines on it. The overlay is
            lg:hidden, so the split is CSS-driven: desktop keeps a plain typable
            input and never mounts the sheet. */}
        <div className="relative mt-1">
          <input
            id={amountId}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={values.amount}
            onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
            placeholder="0.00"
            className="field"
          />
          <button
            type="button"
            onClick={() => setKeypadOpen(true)}
            aria-label="Open the calculator keypad to set the amount"
            className="absolute inset-0 lg:hidden"
          />
        </div>
      </div>

      {keypadOpen && (
        <AmountKeypadSheet
          initial={values.amount}
          onClose={() => setKeypadOpen(false)}
          onDone={(amount) => {
            setValues((v) => ({ ...v, amount }));
            setKeypadOpen(false);
          }}
        />
      )}

      <div>
        <label htmlFor={categoryId} className="block text-sm font-medium text-ink-muted">
          Category
        </label>
        <select
          id={categoryId}
          value={values.category_id}
          onChange={(e) => setValues((v) => ({ ...v, category_id: e.target.value }))}
          className="field mt-1"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={dateId} className="block text-sm font-medium text-ink-muted">
          Date
        </label>
        <input
          id={dateId}
          type="date"
          value={values.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          className="field mt-1"
        />
      </div>

      <div>
        <label htmlFor={noteId} className="block text-sm font-medium text-ink-muted">
          Note (optional)
        </label>
        <input
          id={noteId}
          type="text"
          value={values.note}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          placeholder="Lunch with Alex"
          className="field mt-1"
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
                className="field w-auto px-2 py-1 text-xs"
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

      {error && <p className="text-sm text-vermilion">{error}</p>}

      <div className="flex items-center gap-2 pt-2">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || pending}
            className="rounded-lg px-3 py-2 text-sm font-medium text-vermilion hover:bg-vermilion-soft disabled:opacity-50 dark:hover:bg-vermilion/10"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className="btn btn-ghost px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn btn-gold px-4 py-2 text-sm">
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
