"use client";

import { useMemo } from "react";
import { useMoney } from "@/app/components/CurrencyProvider";
import type { GoalAchievement } from "@/lib/types";
import Daruma from "./Daruma";
import CoinGlyph from "@/app/components/CoinGlyph";

/**
 * Fortune wins — the year-in-review of Fortune Goals the user has met. Reads
 * the immutable goal_achievements ledger (migration 0026), so a win stays here
 * even after the goal is edited or deleted. Grouped by the year it was reached,
 * newest first; each win shows a fully-painted daruma (both eyes).
 */
export default function GoalWins({
  achievements,
  isPro,
}: {
  achievements: GoalAchievement[];
  isPro: boolean;
}) {
  const { format } = useMoney();

  const byYear = useMemo(() => {
    const groups = new Map<number, GoalAchievement[]>();
    for (const a of achievements) {
      const year = new Date(a.achieved_at).getFullYear();
      const list = groups.get(year) ?? [];
      list.push(a);
      groups.set(year, list);
    }
    // Newest year first; within a year, most-recently reached first.
    return [...groups.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, list]) => ({
        year,
        list: list.sort(
          (a, b) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime(),
        ),
      }));
  }, [achievements]);

  // Free users with no history: the Fortune Goals teaser already sells the
  // feature, so don't add an empty panel here.
  if (!isPro && achievements.length === 0) return null;

  return (
    <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="flex items-center gap-2">
        <CoinGlyph size={17} />
        <h2 className="text-sm font-medium text-ink-subtle">Fortune wins</h2>
        {achievements.length > 0 && (
          <span className="rounded-full bg-jade-soft px-2 py-0.5 font-mono text-[10px] font-medium text-jade">
            {achievements.length} met
          </span>
        )}
      </div>

      {achievements.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          No wins yet — the day a goal fills up, it lands here for good, so you can look back on
          every wish that came true this year.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {byYear.map(({ year, list }) => (
            <div key={year}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-bold tracking-tight text-ink">{year}</h3>
                <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">
                  {list.length} {list.length === 1 ? "goal" : "goals"} met
                </span>
              </div>
              <ul className="mt-2 space-y-2">
                {list.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5"
                  >
                    <Daruma progress={1} size={34} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                      <p className="mt-0.5 text-xs text-ink-subtle [font-variant-numeric:tabular-nums]">
                        {format(a.target_amount)}
                        {a.kind === "emergency" && " · emergency fund"}
                      </p>
                    </div>
                    <span className="shrink-0 text-right font-mono text-[11px] text-jade">
                      ✓{" "}
                      {new Date(a.achieved_at).toLocaleDateString("en-SG", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
