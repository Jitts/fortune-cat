"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { resolveMerchant } from "@/lib/merchants";
import type { Category, Transaction, TransactionProvenance } from "@/lib/types";
import AiTagBadge from "./AiTagBadge";

// Where collapsed-month state lives between visits.
const COLLAPSED_KEY = "fc-tx-collapsed-months";

// A signed value so income adds and expense subtracts — used for the per-day
// and per-month net subtotals shown on the group headers.
function signedAmount(t: Transaction) {
  return t.type === "income" ? t.amount : -t.amount;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// "Today · Sat, 13 Jul" / "Yesterday · …" for the two most recent days, else the
// weekday + date. Keeps the day headers scannable without repeating the year.
function dayLabel(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  const stamp = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  if (diffDays === 0) return `Today · ${stamp}`;
  if (diffDays === 1) return `Yesterday · ${stamp}`;
  return stamp;
}

// A net subtotal: green when money came in, red (strong, for months) or muted
// (soft, for days) when more went out than came in.
function NetAmount({ value, strong = false }: { value: number; strong?: boolean }) {
  const positive = value >= 0;
  const cls = positive
    ? strong
      ? "text-emerald-700"
      : "text-emerald-600"
    : strong
      ? "text-red-600"
      : "text-ink-faint";
  return (
    <span className={`[font-variant-numeric:tabular-nums] ${cls}`}>
      {positive ? "+" : "−"}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

function TransactionRow({
  t,
  categories,
  provenance,
  onDetails,
  onEdit,
  onDelete,
  deletingId,
  onAcceptTag,
  onRejectTag,
  tagPending,
}: {
  t: Transaction;
  categories: Category[];
  provenance: Record<string, TransactionProvenance>;
  onDetails: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  onAcceptTag: (id: string) => void;
  onRejectTag: (id: string) => void;
  tagPending: boolean;
}) {
  const category = categories.find((c) => c.id === t.category_id);
  const isIncome = t.type === "income";
  const prov = provenance[t.id];
  const merchant = resolveMerchant(t.note);
  const title = merchant?.name ?? t.note ?? category?.name ?? "Transaction";
  const rawDiffers = !!merchant && !!t.note && merchant.name !== t.note;
  return (
    <li className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <button
          onClick={() => onDetails(t)}
          className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left hover:opacity-80"
          title="View details"
        >
          <span className="text-xl">{category?.icon ?? "•"}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{title}</p>
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-subtle">
              <span>{category?.name ?? "Uncategorized"}</span>
              {t.entry_source === "email_auto" && (
                <span className="rounded-full bg-emerald-50 px-1.5 py-px font-mono text-[10px] text-emerald-700">
                  ⚡ auto
                </span>
              )}
              {t.entry_source === "email_review" && (
                <span className="rounded-full bg-surface-3 px-1.5 py-px font-mono text-[10px] text-ink-subtle">
                  ✉ reviewed
                </span>
              )}
              {t.entry_source === "csv" && (
                <span className="rounded-full bg-surface-3 px-1.5 py-px font-mono text-[10px] text-ink-subtle">
                  📄 import
                </span>
              )}
              {t.entry_source === "sms" && (
                <span className="rounded-full bg-surface-3 px-1.5 py-px font-mono text-[10px] text-ink-subtle">
                  💬 sms
                </span>
              )}
              {t.account_tag && (
                <span className="rounded bg-surface-3 px-1.5 py-px font-mono text-[10px] uppercase text-ink-subtle">
                  {t.account_tag}
                </span>
              )}
              {t.original_currency && t.original_amount != null && (
                <span className="font-mono text-[10px] text-ink-faint">
                  {t.original_currency} {t.original_amount.toLocaleString("en-SG")}
                </span>
              )}
              {merchant?.biller && (
                <span className="rounded-full bg-surface-3 px-1.5 py-px font-mono text-[10px] text-ink-subtle">
                  ↻ biller
                </span>
              )}
            </p>
            {(rawDiffers || prov) && (
              <p className="truncate font-mono text-[10px] text-ink-faint">
                {[
                  rawDiffers ? t.note : null,
                  prov ? (prov.from_address ?? prov.source) : null,
                  prov ? `ref ${prov.message_id.slice(0, 18)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
        </button>
        <div className="pl-9">
          <AiTagBadge
            transaction={t}
            categories={categories}
            onAccept={onAcceptTag}
            onReject={onRejectTag}
            pending={tagPending}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${isIncome ? "text-emerald-700" : "text-ink"}`}
        >
          {isIncome ? "+" : "-"}
          {formatCurrency(t.amount)}
        </span>
        <button
          onClick={() => onEdit(t)}
          className="text-xs font-medium text-ink-subtle hover:text-ink"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(t.id)}
          disabled={deletingId === t.id}
          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {deletingId === t.id ? "Deleting…" : "Delete"}
        </button>
      </div>
    </li>
  );
}

export default function TransactionList({
  transactions,
  categories,
  provenance,
  onDetails,
  onEdit,
  onDelete,
  deletingId,
  onAcceptTag,
  onRejectTag,
  tagPending,
}: {
  transactions: Transaction[];
  categories: Category[];
  provenance: Record<string, TransactionProvenance>;
  onDetails: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  onAcceptTag: (id: string) => void;
  onRejectTag: (id: string) => void;
  tagPending: boolean;
}) {
  // Which months the user has collapsed, persisted so they stay folded across
  // reloads. The header still shows the month's net, so a collapsed month
  // remains informative.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Restore on mount — localStorage is client-only, so we start empty (matching
  // the server render) and reconcile after hydration to avoid a mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (raw) setCollapsed(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore unavailable or malformed storage
    }
    setHydrated(true);
  }, []);

  // Persist after hydration, so the initial empty state never clobbers storage.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
    } catch {
      // ignore quota or unavailable storage
    }
  }, [collapsed, hydrated]);

  // Fold the flat, date-desc list into months → days, carrying a running net
  // subtotal at each level. Insertion order stays reverse-chronological because
  // we walk a defensively-sorted copy.
  const months = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1;
    });
    const byMonth = new Map<
      string,
      { key: string; net: number; days: Map<string, { key: string; net: number; items: Transaction[] }> }
    >();
    for (const t of sorted) {
      const mk = t.date.slice(0, 7);
      const dk = t.date.slice(0, 10);
      let month = byMonth.get(mk);
      if (!month) {
        month = { key: mk, net: 0, days: new Map() };
        byMonth.set(mk, month);
      }
      let day = month.days.get(dk);
      if (!day) {
        day = { key: dk, net: 0, items: [] };
        month.days.set(dk, day);
      }
      const s = signedAmount(t);
      month.net += s;
      day.net += s;
      day.items.push(t);
    }
    return [...byMonth.values()].map((m) => ({ ...m, days: [...m.days.values()] }));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-10 text-center shadow-sm ring-1 ring-line">
        <p className="text-sm text-ink-subtle">No transactions yet — add your first one</p>
      </div>
    );
  }

  function toggleMonth(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line">
      {months.map((month) => {
        const isCollapsed = collapsed.has(month.key);
        return (
          <section key={month.key} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => toggleMonth(month.key)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-surface-2"
            >
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <span
                  className={`inline-block text-[10px] leading-none transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                  aria-hidden
                >
                  ▾
                </span>
                {monthLabel(month.key)}
              </span>
              <span className="text-sm font-semibold">
                <NetAmount value={month.net} strong />
              </span>
            </button>

            {!isCollapsed &&
              month.days.map((day) => (
                <div key={day.key}>
                  <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2 px-6 py-1.5">
                    <span className="text-xs font-medium text-ink-subtle">{dayLabel(day.key)}</span>
                    <span className="text-xs">
                      <NetAmount value={day.net} />
                    </span>
                  </div>
                  <ul className="divide-y divide-line">
                    {day.items.map((t) => (
                      <TransactionRow
                        key={t.id}
                        t={t}
                        categories={categories}
                        provenance={provenance}
                        onDetails={onDetails}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        deletingId={deletingId}
                        onAcceptTag={onAcceptTag}
                        onRejectTag={onRejectTag}
                        tagPending={tagPending}
                      />
                    ))}
                  </ul>
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}
