import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InsightsShell from "./InsightsShell";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
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
  ] = await Promise.all([
    supabase.from("transactions").select().order("date", { ascending: false }),
    supabase.from("categories").select().order("name"),
    supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle(),
    supabase
      .from("email_transaction_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return (
    <Suspense>
      <InsightsShell
        transactions={transactions ?? []}
        categories={categories ?? []}
        isPro={!!activePayment}
        userEmail={user.email ?? ""}
        pendingReviewCount={pendingReviewCount ?? 0}
      />
    </Suspense>
  );
}
