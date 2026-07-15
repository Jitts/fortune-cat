import { flowKey, median } from "@/lib/recurring";
import { resolveMerchant } from "@/lib/merchants";
import { isSubscriptionMerchant } from "@/lib/cancelPlaybooks";
import type { Transaction } from "@/lib/types";

/**
 * Subscription detection (rules, no LLM) — the "find" half of the kill-chain.
 * Reuses the radar's grouping (flowKey) and median so it never diverges from
 * how Fortune Cat already thinks about recurring flows, then keeps only the
 * groups whose merchant is a known cancellable subscription (has a cancel
 * playbook) and is still active. Utilities you can't cancel (SP Services, PUB,
 * IRAS…) are billers but not subscriptions, so they're excluded by design.
 */

export type Subscription = {
  key: string; // merchant name — the decision + playbook key
  name: string;
  monthlyAmount: number; // median of the observed charges
  annualAmount: number;
  lastDate: string; // yyyy-mm-dd
  occurrences: number;
};

const DAY_MS = 86_400_000;
// Still-active window: a known sub charged within ~70 days is treated as live
// (covers a skipped/late monthly cycle without resurrecting long-dead ones).
const ACTIVE_WINDOW_DAYS = 70;

export function detectSubscriptions(
  transactions: Transaction[],
  today = new Date(),
): Subscription[] {
  const todayStr = today.toISOString().slice(0, 10);
  const groups = new Map<string, Transaction[]>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const merchant = resolveMerchant(t.note);
    if (!merchant || !isSubscriptionMerchant(merchant.name)) continue;
    const key = flowKey(t);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const subs: Subscription[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const last = list[list.length - 1];
    const daysSinceLast = Math.round((Date.parse(todayStr) - Date.parse(last.date)) / DAY_MS);
    if (daysSinceLast > ACTIVE_WINDOW_DAYS) continue; // lapsed — not an active sub

    const merchant = resolveMerchant(last.note);
    const monthlyAmount = median(list.map((t) => t.amount));
    subs.push({
      key: merchant?.name ?? last.note ?? "Unknown",
      name: merchant?.name ?? last.note ?? "Unknown",
      monthlyAmount,
      annualAmount: monthlyAmount * 12,
      lastDate: last.date,
      occurrences: list.length,
    });
  }

  subs.sort((a, b) => b.annualAmount - a.annualAmount);
  return subs;
}
