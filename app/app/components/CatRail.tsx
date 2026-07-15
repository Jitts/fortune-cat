"use client";

import { useMemo } from "react";
import { monthPulse } from "@/lib/monthPulse";
import { catState } from "./FortuneCat";
import LuckRing from "./LuckRing";
import LanternStreak from "./LanternStreak";
import PouchSummary from "./PouchSummary";
import type { BalanceAnchor, FortuneGoal, Transaction } from "@/lib/types";

/**
 * The Shrine's left rail: lantern streak → luck ring + cat → "well fed" caption →
 * the pouch. The cat is the centre of the app (Direction B). Reuses monthPulse
 * so the ring, caption and streak agree with the rest of the dashboard.
 */
export default function CatRail({
  transactions,
  goals,
  anchor,
  isPro,
}: {
  transactions: Transaction[];
  goals: FortuneGoal[];
  anchor: BalanceAnchor | null;
  isPro: boolean;
}) {
  const pulse = useMemo(() => monthPulse(transactions), [transactions]);
  const state = catState(pulse.net, pulse.burnDelta);
  const sr = pulse.savingsRate;

  const caption =
    state === "saving"
      ? "Well fed · luck is rising"
      : state === "even"
        ? "Watchful · luck holds steady"
        : "Ears back · luck is thin";
  const monthName = new Date().toLocaleDateString("en-SG", { month: "long" });
  const ringNote =
    sr != null && sr > 0
      ? `the ring is your savings pace — saving ${sr}% of ${monthName}'s income`
      : sr != null && sr < 0
        ? "the ring is your savings pace — you're in the red this month"
        : "the ring is your savings pace";

  return (
    <div className="flex flex-col items-center gap-4">
      {pulse.streak >= 1 && (
        <LanternStreak count={pulse.streak} label={`${pulse.streak}-night capture streak`} />
      )}

      <LuckRing savingsRate={sr} state={state} size={150} />

      <div className="text-center">
        <p className="text-base font-semibold text-ink">{caption}</p>
        <p className="mx-auto mt-1 max-w-[15rem] text-xs text-ink-subtle">{ringNote}</p>
      </div>

      <div className="w-full">
        <PouchSummary transactions={transactions} goals={goals} anchor={anchor} isPro={isPro} />
      </div>
    </div>
  );
}
