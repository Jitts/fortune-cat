"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { detectSubscriptions } from "@/lib/subscriptions";
import { getPlaybook } from "@/lib/cancelPlaybooks";
import { useMoney } from "@/app/components/CurrencyProvider";
import { setSubscriptionDecision } from "../subscriptionActions";
import type { SubscriptionDecision, SubscriptionStatus, Transaction } from "@/lib/types";

const STATUS_META: Record<SubscriptionStatus, { label: string; pill: string }> = {
  keep: { label: "Keeping", pill: "bg-surface-3 text-ink-muted" },
  cancelling: { label: "Cancelling", pill: "bg-gold-soft text-gold-text" },
  cancelled: { label: "Cancelled", pill: "bg-jade-soft text-jade" },
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
  const { format } = useMoney();
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
      <div className="rounded-2xl border-t-2 border-gold bg-surface p-6 shadow-sm ring-1 ring-line">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-ink-subtle">🗡️ Subscription kill-chain</h2>
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-gold-text">
            PRO
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          Found <b>{subs.length} subscription{subs.length === 1 ? "" : "s"}</b> costing about{" "}
          <b>{format(annualTotal)}/year</b>. Go Pro for cancel playbooks and to track what
          you kill.
        </p>
        <Link
          href="/upgrade"
          className="mt-3 inline-block rounded-lg bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action/90"
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
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-ink-subtle">🗡️ Subscription kill-chain</h2>
          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-gold-text">
            PRO
          </span>
        </div>
        {freedAnnual > 0 && (
          <span className="rounded-full bg-jade-soft px-2.5 py-0.5 text-xs font-semibold text-jade [font-variant-numeric:tabular-nums]">
            freed {format(freedAnnual)}/yr
          </span>
        )}
      </div>

      <ul className="mt-3 divide-y divide-line">
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
                      cancelled ? "text-ink-faint line-through" : "text-ink"
                    }`}
                  >
                    {sub.name}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-subtle">
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
                  <p className="text-sm font-semibold text-ink [font-variant-numeric:tabular-nums]">
                    {format(sub.monthlyAmount)}
                    <span className="font-normal text-ink-faint">/mo</span>
                  </p>
                  <p className="text-[11px] text-ink-subtle [font-variant-numeric:tabular-nums]">
                    {format(sub.annualAmount)}/yr
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setOpenPlaybook(open ? null : sub.key)}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2"
                >
                  {open ? "Hide how" : "How to cancel"}
                </button>
                <span className="mx-1 h-4 w-px bg-surface-3" />
                {(["keep", "cancelling", "cancelled"] as SubscriptionStatus[]).map((s) => {
                  const active = decision?.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => decide(sub.key, s, sub.monthlyAmount)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-action text-white"
                          : "border border-line text-ink-muted hover:bg-surface-2"
                      }`}
                    >
                      {s === "keep" ? "Keep" : s === "cancelling" ? "Cancelling" : "Cancelled"}
                    </button>
                  );
                })}
              </div>

              {open && (
                <div className="mt-2 rounded-lg bg-surface-2 p-3 text-xs text-ink-muted">
                  <ol className="list-decimal space-y-1 pl-4">
                    {playbook.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                  {playbook.note && (
                    <p className="mt-2 text-[11px] text-gold-text">⚠ {playbook.note}</p>
                  )}
                  {playbook.url && (
                    <a
                      href={playbook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block font-medium text-ink underline hover:text-ink-muted"
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

      <p className="mt-3 text-[11px] text-ink-faint">
        Detected from your captured charges — rules only. Cancel steps are guidance; nothing is
        cancelled for you.
      </p>
    </div>
  );
}
