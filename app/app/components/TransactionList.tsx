"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoney } from "@/app/components/CurrencyProvider";
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

// Inside a year section the year is already on the header, so months show just
// their name ("July") to avoid repeating it on every bar.
function monthNameLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" });
}

// "Today · Sat, 13 Jul" / "Yesterday · …" for the two most recent days, else the
// weekday + date. Keeps the day headers scannable without repeating the year.
function isToday(dateKey: string) {
  const now = new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateKey === local;
}

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
  const { format } = useMoney();
  const positive = value >= 0;
  const cls = positive
    ? strong
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-emerald-600 dark:text-emerald-400"
    : strong
      ? "text-red-600 dark:text-red-400"
      : "text-ink-faint";
  return (
    <span className={`[font-variant-numeric:tabular-nums] ${cls}`}>
      {positive ? "+" : "−"}
      {format(Math.abs(value))}
    </span>
  );
}

function TransactionRow({
  t,
  categories,
  provenance,
  onEdit,
  onAcceptTag,
  onRejectTag,
  tagPending,
}: {
  t: Transaction;
  categories: Category[];
  provenance: Record<string, TransactionProvenance>;
  onEdit: (t: Transaction) => void;
  onAcceptTag: (id: string) => void;
  onRejectTag: (id: string) => void;
  tagPending: boolean;
}) {
  const { format } = useMoney();
  const category = categories.find((c) => c.id === t.category_id);
  const isIncome = t.type === "income";
  const prov = provenance[t.id];
  const merchant = resolveMerchant(t.note);
  const title = merchant?.name ?? t.note ?? category?.name ?? "Transaction";
  const rawDiffers = !!merchant && !!t.note && merchant.name !== t.note;
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
      <div className="min-w-0 flex-1">
        <button
          onClick={() => onEdit(t)}
          className="flex w-full min-w-0 items-center gap-3 rounded-lg text-left hover:opacity-80"
          title="Edit transaction"
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
      <button
        onClick={() => onEdit(t)}
        className="shrink-0 rounded-lg text-right hover:opacity-80"
        title="Edit transaction"
      >
        <span
          className={`text-sm font-semibold [font-variant-numeric:tabular-nums] ${isIncome ? "text-emerald-700 dark:text-emerald-400" : "text-ink"}`}
        >
          {isIncome ? "+" : "-"}
          {format(t.amount)}
        </span>
      </button>
    </li>
  );
}

export default function TransactionList({
  transactions,
  categories,
  provenance,
  onEdit,
  onAcceptTag,
  onRejectTag,
  tagPending,
}: {
  transactions: Transaction[];
  categories: Category[];
  provenance: Record<string, TransactionProvenance>;
  onEdit: (t: Transaction) => void;
  onAcceptTag: (id: string) => void;
  onRejectTag: (id: string) => void;
  tagPending: boolean;
}) {
  // Which years/months the user has collapsed, persisted so they stay folded
  // across reloads. Year keys are "2026"; month keys are "2026-07" — different
  // shapes, so they share one Set without colliding. Each header still shows its
  // net, so a collapsed period stays informative.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Restore on mount — localStorage is client-only, so we start empty (matching
  // the server render) and reconcile after hydration to avoid a mismatch. With
  // no stored pick, apply the "older folded" default instead of showing all.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      setCollapsed(raw ? new Set(JSON.parse(raw) as string[]) : defaultCollapsed);
    } catch {
      setCollapsed(defaultCollapsed);
    }
    setHydrated(true);
    // Seed once on mount; later data changes shouldn't re-fold what the user opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Fold the flat, date-desc list into years → months → days, carrying a running
  // net subtotal at each level. Insertion order stays reverse-chronological
  // because we walk a defensively-sorted copy.
  type Day = { key: string; net: number; items: Transaction[] };
  type Month = { key: string; net: number; days: Day[] };
  type Year = { key: string; net: number; months: Month[] };

  const years = useMemo<Year[]>(() => {
    const sorted = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (a.created_at ?? "") < (b.created_at ?? "") ? 1 : -1;
    });
    const byYear = new Map<
      string,
      { key: string; net: number; months: Map<string, { key: string; net: number; days: Map<string, Day> }> }
    >();
    for (const t of sorted) {
      const yk = t.date.slice(0, 4);
      const mk = t.date.slice(0, 7);
      const dk = t.date.slice(0, 10);
      let year = byYear.get(yk);
      if (!year) {
        year = { key: yk, net: 0, months: new Map() };
        byYear.set(yk, year);
      }
      let month = year.months.get(mk);
      if (!month) {
        month = { key: mk, net: 0, days: new Map() };
        year.months.set(mk, month);
      }
      let day = month.days.get(dk);
      if (!day) {
        day = { key: dk, net: 0, items: [] };
        month.days.set(dk, day);
      }
      const s = signedAmount(t);
      year.net += s;
      month.net += s;
      day.net += s;
      day.items.push(t);
    }
    return [...byYear.values()].map((y) => ({
      ...y,
      months: [...y.months.values()].map((m) => ({ ...m, days: [...m.days.values()] })),
    }));
  }, [transactions]);

  // First-visit default: fold every period except the newest year and, within
  // it, the newest month — so the ledger opens on "now" and history stays tucked
  // away (matching the mockup). A stored pick always wins over this.
  const defaultCollapsed = useMemo(() => {
    const set = new Set<string>();
    years.forEach((y, yi) => {
      if (yi > 0) set.add(y.key);
      y.months.forEach((m, mi) => {
        if (yi > 0 || mi > 0) set.add(m.key);
      });
    });
    return set;
  }, [years]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-surface p-10 text-center shadow-sm ring-1 ring-line">
        <p className="text-sm text-ink-subtle">No transactions yet — add your first one</p>
      </div>
    );
  }

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {years.map((year) => {
        const yearCollapsed = collapsed.has(year.key);
        return (
          <section key={year.key} className="overflow-hidden rounded-2xl border border-line bg-surface">
            {/* year bar */}
            <button
              type="button"
              onClick={() => toggle(year.key)}
              aria-expanded={!yearCollapsed}
              className="flex w-full items-center justify-between gap-3 bg-surface-2 px-4 py-3 text-left hover:bg-surface-3"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-ink">
                <span
                  className={`inline-block text-[11px] leading-none text-ink-faint transition-transform ${yearCollapsed ? "-rotate-90" : ""}`}
                  aria-hidden
                >
                  ▾
                </span>
                {year.key}
              </span>
              <span className="text-sm font-semibold">
                <NetAmount value={year.net} strong />
              </span>
            </button>

            {!yearCollapsed && (
              <div className="px-2 pb-2 pt-1">
                {year.months.map((month) => {
                  const monthCollapsed = collapsed.has(month.key);
                  return (
                    <section key={month.key}>
                      {/* month bar */}
                      <button
                        type="button"
                        onClick={() => toggle(month.key)}
                        aria-expanded={!monthCollapsed}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-3"
                      >
                        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                          <span
                            className={`inline-block text-[10px] leading-none transition-transform ${monthCollapsed ? "-rotate-90" : ""}`}
                            aria-hidden
                          >
                            ▾
                          </span>
                          {monthNameLabel(month.key)}
                        </span>
                        <span className="text-sm font-semibold">
                          <NetAmount value={month.net} strong />
                        </span>
                      </button>

                      {!monthCollapsed && (
                        <div className="relative">
                          {/* the spine — a thread the day beads hang on */}
                          <div
                            aria-hidden
                            className="pointer-events-none absolute bottom-3 left-[19px] top-1 w-px bg-line"
                          />
                          {month.days.map((day) => (
                            <div key={day.key}>
                              <div className="relative z-10 flex items-center justify-between gap-3 py-1.5 pl-4 pr-2">
                                <span className="flex items-center gap-2 text-xs font-medium text-ink-subtle">
                                  {/* day bead on the spine — today glows gold, the rest stay quiet */}
                                  <span
                                    aria-hidden
                                    className={`inline-block h-2 w-2 rounded-full ${
                                      isToday(day.key) ? "bg-fortune-400 ring-2 ring-fortune-400/30" : "bg-line ring-2 ring-surface-2"
                                    }`}
                                    style={isToday(day.key) ? { filter: "drop-shadow(0 0 3px rgba(255,215,0,.7))" } : undefined}
                                  />
                                  {dayLabel(day.key)}
                                </span>
                                <span className="text-xs">
                                  <NetAmount value={day.net} />
                                </span>
                              </div>
                              <ul className="space-y-2 pb-3 pl-8 pr-1">
                                {day.items.map((t) => (
                                  <TransactionRow
                                    key={t.id}
                                    t={t}
                                    categories={categories}
                                    provenance={provenance}
                                    onEdit={onEdit}
                                    onAcceptTag={onAcceptTag}
                                    onRejectTag={onRejectTag}
                                    tagPending={tagPending}
                                  />
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
