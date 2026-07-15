import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BalanceAnchor, CategoryBudget, FortuneGoal, FortuneSlipRow, SubscriptionDecision, TransactionProvenance } from "@/lib/types";
import AppShell from "./AppShell";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [
    { data: transactions },
    { data: categories },
    { data: activePayment },
    { count: pendingReviewCount },
    { data: provenanceRows },
    { count: capturedCount },
    { count: trustedCount },
    { count: backfilledCount },
    { data: goals },
    { data: budgets },
    { data: slips },
    { data: anchor },
    { data: subscriptionDecisions },
  ] = await Promise.all([
    supabase.from("transactions").select().order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("categories").select().order("name"),
    supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle(),
    supabase
      .from("email_transaction_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("email_transaction_candidates")
      .select(
        "transaction_id, source, from_address, subject, raw_snippet, message_id, email_date, review_reason, auto_posted",
      )
      .not("transaction_id", "is", null),
    supabase.from("email_transaction_candidates").select("id", { count: "exact", head: true }),
    supabase.from("trusted_senders").select("id", { count: "exact", head: true }),
    supabase
      .from("email_transaction_candidates")
      .select("id", { count: "exact", head: true })
      .in("source", ["csv", "pdf", "image"]),
    supabase.from("fortune_goals").select().order("created_at", { ascending: true }),
    supabase.from("category_budgets").select(),
    supabase.from("fortune_slips").select().order("slip_date", { ascending: false }),
    supabase
      .from("balance_anchors")
      .select()
      .order("anchored_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("subscription_decisions").select(),
  ]);

  // Daily fortune: today's drawn slip (if any) + the consecutive-day streak.
  // All arithmetic in UTC-day units so the server's timezone can't shift it.
  const sgToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
  const slipDates = new Set((slips ?? []).map((s) => (s as FortuneSlipRow).slip_date));
  const todaySlip = ((slips ?? []) as FortuneSlipRow[]).find((s) => s.slip_date === sgToday) ?? null;
  const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const [yy, mm, dd] = sgToday.split("-").map(Number);
  let cursorMs = Date.UTC(yy, mm - 1, dd);
  if (!slipDates.has(sgToday)) cursorMs -= 86_400_000; // allow a streak ending yesterday
  let slipStreak = 0;
  while (slipDates.has(isoDay(cursorMs))) {
    slipStreak += 1;
    cursorMs -= 86_400_000;
  }

  const provenance: Record<string, TransactionProvenance> = {};
  for (const row of (provenanceRows ?? []) as TransactionProvenance[]) {
    if (row.transaction_id) provenance[row.transaction_id] = row;
  }

  const setup = {
    captured:
      (capturedCount ?? 0) > 0 || (transactions ?? []).some((t) => t.entry_source !== "manual"),
    trusted: (trustedCount ?? 0) > 0,
    backfilled: (backfilledCount ?? 0) > 0,
  };

  return (
    <Suspense>
      <AppShell
        initialTransactions={transactions ?? []}
        categories={categories ?? []}
        isPro={!!activePayment}
        userEmail={user.email ?? ""}
        pendingReviewCount={pendingReviewCount ?? 0}
        provenance={provenance}
        setup={setup}
        goals={(goals ?? []) as FortuneGoal[]}
        budgets={(budgets ?? []) as CategoryBudget[]}
        todaySlip={todaySlip}
        slipStreak={slipStreak}
        anchor={(anchor ?? null) as BalanceAnchor | null}
        subscriptionDecisions={(subscriptionDecisions ?? []) as SubscriptionDecision[]}
      />
    </Suspense>
  );
}
