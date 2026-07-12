import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TransactionProvenance } from "@/lib/types";
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
  ]);

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
      />
    </Suspense>
  );
}
