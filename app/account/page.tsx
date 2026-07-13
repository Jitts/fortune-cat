import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountShell from "./AccountShell";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
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
    supabase.from("categories").select(),
    supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle(),
    supabase
      .from("email_transaction_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return (
    <Suspense>
      <AccountShell
        userEmail={user.email ?? ""}
        isPro={!!activePayment}
        pendingReviewCount={pendingReviewCount ?? 0}
        transactions={transactions ?? []}
        categories={categories ?? []}
      />
    </Suspense>
  );
}
