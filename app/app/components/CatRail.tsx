"use client";

import { useMemo } from "react";
import { monthPulse } from "@/lib/monthPulse";
import { catState } from "@/lib/catState";
import { useMoney } from "@/app/components/CurrencyProvider";
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
  timezone,
  today,
}: {
  transactions: Transaction[];
  goals: FortuneGoal[];
  anchor: BalanceAnchor | null;
  isPro: boolean;
  /** The user's IANA timezone — keeps the streak on their calendar, not UTC. */
  timezone: string;
  /** The user's local calendar date (YYYY-MM-DD), from their profile timezone. */
  today: string;
}) {
  const { locale } = useMoney();
  const pulse = useMemo(() => monthPulse(transactions, new Date(), timezone), [transactions, timezone]);
  const state = catState(pulse.net, pulse.burnDelta);
  const sr = pulse.savingsRate;

  // The headline states the number the ring is drawing, so the two can never be
  // read as disagreeing. Before, the caption spoke about "luck" while the ring
  // spoke about savings, which is what let them contradict each other.
  const caption =
    state === "saving"
      ? sr != null
        ? `Well fed · saving ${sr}%`
        : "Well fed · more came in than went out"
      : state === "even"
        ? "Watchful · breaking even"
        : "Ears back · in the red this month";
  // The reader's own locale and calendar — not Singapore's.
  const monthName = new Date().toLocaleDateString(locale, { month: "long", timeZone: timezone });
  const ringNote =
    sr != null && sr > 0
      ? `the ring is your savings pace — ${sr}% of ${monthName}'s income stayed put`
      : sr != null && sr < 0
        ? "the ring is your savings pace — you're spending more than comes in"
        : "the ring is your savings pace";

  // Pace used to be able to override the mood outright. It's a real signal, so
  // it keeps a voice — just a subordinate one, and only when it's steep enough
  // to be worth saying. Encouragement leads; the caveat follows.
  // Past a point the percentage stops informing and starts sounding broken:
  // someone who barely used the app last month gets a true but useless "2942%
  // faster". Above 200 the shape of the fact is all that's left, so say that.
  const paceCaveat =
    pulse.burnDelta == null || pulse.burnDelta <= 30
      ? null
      : pulse.burnDelta > 200
        ? "spending far faster than last month"
        : `spending ${pulse.burnDelta}% faster than last month`;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-col items-center gap-4">
        {/* Rendered at zero too. Hiding the whole row when the streak lapsed
            made a feature that was there yesterday simply vanish, which reads
            as broken rather than as "your streak ended" — six unlit lanterns
            and an invitation say the true thing. */}
        <LanternStreak
          count={pulse.streak}
          label={
            pulse.streak >= 1
              ? `${pulse.streak}-night streak`
              : "no streak yet · log something today"
          }
        />

        <LuckRing savingsRate={sr} state={state} size={150} />

        <div className="text-center">
          <p className="text-base font-semibold text-ink">{caption}</p>
          <p className="mx-auto mt-1 max-w-[15rem] text-xs text-ink-subtle">{ringNote}</p>
          {paceCaveat && (
            <p className="mx-auto mt-1.5 max-w-[15rem] text-xs text-ink-muted">
              <span aria-hidden>·</span> {paceCaveat}
            </p>
          )}
        </div>
      </div>

      <PouchSummary transactions={transactions} goals={goals} anchor={anchor} isPro={isPro} today={today} />
    </div>
  );
}
