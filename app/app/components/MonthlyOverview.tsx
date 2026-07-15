import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/lib/types";

type MonthRow = {
  key: string;
  label: string;
  inTotal: number;
  outTotal: number;
  net: number;
};

/**
 * Month-by-month cash flow: in, out and net for up to the last 12 months
 * with data, paired bars scaled to the biggest month. The pulse shows this
 * month's heartbeat; this card shows the trend line behind it.
 */
export default function MonthlyOverview({ transactions }: { transactions: Transaction[] }) {
  const months = useMemo<MonthRow[]>(() => {
    const map = new Map<string, { inTotal: number; outTotal: number }>();
    for (const t of transactions) {
      const key = t.date.slice(0, 7); // yyyy-mm
      const entry = map.get(key) ?? { inTotal: 0, outTotal: 0 };
      if (t.type === "income") entry.inTotal += t.amount;
      else entry.outTotal += t.amount;
      map.set(key, entry);
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([key, v]) => ({
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-SG", {
          month: "short",
          year: "2-digit",
        }),
        inTotal: v.inTotal,
        outTotal: v.outTotal,
        net: v.inTotal - v.outTotal,
      }));
  }, [transactions]);

  if (months.length < 2) return null;

  const maxBar = Math.max(1, ...months.map((m) => Math.max(m.inTotal, m.outTotal)));
  const currentKey = new Date().toISOString().slice(0, 7);

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <h2 className="text-sm font-medium text-ink-subtle">Monthly overview</h2>
      <ul className="mt-3 space-y-3">
        {months.map((m) => (
          <li key={m.key} className={m.key === currentKey ? "" : "opacity-80"}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="w-16 shrink-0 font-mono text-xs text-ink-subtle">
                {m.label}
                {m.key === currentKey && <span className="text-emerald-700"> ·</span>}
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="h-1.5 w-full overflow-hidden rounded bg-surface-3">
                  <div
                    className="h-full rounded bg-emerald-600"
                    style={{ width: `${Math.min(100, (m.inTotal / maxBar) * 100)}%` }}
                  />
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded bg-surface-3">
                  <div
                    className="h-full rounded bg-out"
                    style={{ width: `${Math.min(100, (m.outTotal / maxBar) * 100)}%` }}
                  />
                </div>
              </div>
              <span
                className={`w-24 shrink-0 text-right text-sm font-semibold [font-variant-numeric:tabular-nums] ${
                  m.net >= 0 ? "text-emerald-700" : "text-ink"
                }`}
              >
                {m.net >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(m.net))}
              </span>
            </div>
            <div className="mt-0.5 flex justify-between pl-16 pr-24 font-mono text-[10px] text-ink-faint [font-variant-numeric:tabular-nums]">
              <span className="text-emerald-700">▲ {formatCurrency(m.inTotal)}</span>
              <span>▼ {formatCurrency(m.outTotal)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
