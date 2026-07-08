import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import AppShell from "./AppShell";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }, { data: activePayment }] = await Promise.all([
    supabase.from("transactions").select().order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("categories").select().order("name"),
    supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle(),
  ]);

  return (
    <Suspense>
      <AppShell
        initialTransactions={transactions ?? []}
        categories={categories ?? []}
        isPro={!!activePayment}
      />
    </Suspense>
  );
}
