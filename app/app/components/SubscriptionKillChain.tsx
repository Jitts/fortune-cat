"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { detectSubscriptions } from "@/lib/subscriptions";
import { getPlaybook } from "@/lib/cancelPlaybooks";
import { formatCurrency } from "@/lib/format";
import { setSubscriptionDecision } from "../subscriptionActions";
import type { SubscriptionDecision, SubscriptionStatus, Transaction } from "@/lib/types";

const STATUS_META: Record<SubscriptionStatus, { label: string; pill: string }> = {
  keep: { label: "Keeping", pill: "bg-neutral-100 text-neutral-600" },
  cancelling: { label: "Cancelling", pill: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Cancelled", pill: "bg-emerald-50 text-emerald-700" },
};

function lastChargedLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
  return `last charged ${d}`;
}

/**
 * The subscription kill-chain (Pro): every detected recurring subscription
 * ranked by annual cost, with a cancel playbook and a persisted verdict. The
 * header tallies the annual money freed from everything marked cancelled. Free
 * users see a teaser (mirrors RecurringRadar).
 */
export default function SubscriptionKillChain({
  transactions,
  decisions,
  isPro,
}: {
  transactions: Transaction[];
  decisions: SubscriptionDecision[];
  isPro: boolean;
}) {
  const subs = useMemo(() => detectSubscriptions(transactions), [transactions]);

  const [decisionMap, setDecisionMap] = useState<Record<string, SubscriptionDecision>>(() =>
    Object.fromEntries(decisions.map((d) => [d.merchant_key, d])),
  );
  const [openPlaybook, setOpenPlaybook] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (subs.length === 0) return null;

  if (!isPro) {
    const annualTotal = subs.reduce((s, x) => s + x.annualAmount, 0);
    return (
      <div className="rounded-2xl border-t-2 border-fortune-400 bg-white p-6 shadow-sm ring-1 ring-neutral-200">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-500">🗡️ Subscription kill-chain</h2>
          <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
            PRO
          </span>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Found <b>{subs.length} subscription{subs.length === 1 ? "" : "s"}</b> costing about{" "}
          <b>{formatCurrency(annualTotal)}/year</b>. Go Pro for cancel playbooks and to track what
          you kill.
        </p>
        <Link
          href="/upgrade"
          className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Go Pro to start cutting
        </Link>
      </div>
    );
  }

  function decide(merchantKey: string, status: SubscriptionStatus, monthlyAmount: number) {
    const prev = decisionMap[merchantKey];
    // optimistic
    setDecisionMap((m) => ({
      ...m,
      [merchantKey]: {
        id: prev?.id ?? `tmp-${merchantKey}`,
        user_id: null,
        merchant_key: merchantKey,
        status,
        monthly_amount: monthlyAmount,
        decided_at: new Date().toISOString(),
      },
    }));
    startTransition(async () => {
      const result = await setSubscriptionDecision(merchantKey, status, monthlyAmount);
      if (result.data) {
        setDecisionMap((m) => ({ ...m, [merchantKey]: result.data }));
      } else {
        // revert on failure
        setDecisionMap((m) => {
          const next = { ...m };
          if (prev) next[merchantKey] = prev;
          else delete next[merchantKey];
          return next;
        });
      }
    });
  }

  const freedAnnual = subs.reduce((sum, sub) => {
    const d = decisionMap[sub.key];
    if (d?.status !== "cancelled") return sum;
    const monthly = d.monthly_amount ?? sub.monthlyAmount;
    return sum + monthly * 12;
  }, 0);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-500">🗡️ Subscription kill-chain</h2>
          <span className="rounded-full bg-fortune-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-fortune-700">
            PRO
          </span>
        </div>
        {freedAnnual > 0 && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 [font-variant-numeric:tabular-nums]">
            freed {formatCurrency(freedAnnual)}/yr
          </span>
        )}
      </div>

      <ul className="mt-3 divide-y divide-neutral-100">
        {subs.map((sub) => {
          const decision = decisionMap[sub.key];
          const playbook = getPlaybook(sub.name);
          const open = openPlaybook === sub.key;
          const cancelled = decision?.status === "cancelled";
          return (
            <li key={sub.key} className="py-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-medium ${
                      cancelled ? "text-neutral-400 line-through" : "text-neutral-900"
                    }`}
                  >
                    {sub.name}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500">
                    <span>{lastChargedLabel(sub.lastDate)}</span>
                    {decision && (
                      <span
                        className={`rounded-full px-1.5 py-px font-mono text-[10px] ${STATUS_META[decision.status].pill}`}
                      >
                        {STATUS_META[decision.status].label}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900 [font-variant-numeric:tabular-nums]">
                    {formatCurrency(sub.monthlyAmount)}
                    <span className="font-normal text-neutral-400">/mo</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 [font-variant-numeric:tabular-nums]">
                    {formatCurrency(sub.annualAmount)}/yr
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setOpenPlaybook(open ? null : sub.key)}
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {open ? "Hide how" : "How to cancel"}
                </button>
                <span className="mx-1 h-4 w-px bg-neutral-200" />
                {(["keep", "cancelling", "cancelled"] as SubscriptionStatus[]).map((s) => {
                  const active = decision?.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => decide(sub.key, s, sub.monthlyAmount)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-neutral-900 text-white"
                          : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {s === "keep" ? "Keep" : s === "cancelling" ? "Cancelling" : "Cancelled"}
                    </button>
                  );
                })}
              </div>

              {open && (
                <div className="mt-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                  <ol className="list-decimal space-y-1 pl-4">
                    {playbook.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  {playbook.note && (
                    <p className="mt-2 text-[11px] text-amber-700">⚠ {playbook.note}</p>
                  )}
                  {playbook.url && (
                    <a
                      href={playbook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block font-medium text-neutral-900 underline hover:text-neutral-700"
                    >
                      Open the cancel page →
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-neutral-400">
        Detected from your captured charges — rules only. Cancel steps are guidance; nothing is
        cancelled for you.
      </p>
    </div>
  );
}
