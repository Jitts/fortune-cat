import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewShell from "./ReviewShell";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: connection }, { data: candidates }, { data: autoPosted }, { data: activePayment }] =
    await Promise.all([
      supabase
        .from("email_connections")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("email_transaction_candidates")
        .select()
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("email_date", { ascending: false }),
      supabase
        .from("email_transaction_candidates")
        .select()
        .eq("user_id", user.id)
        .eq("auto_posted", true)
        .order("email_date", { ascending: false })
        .limit(10),
      supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle(),
    ]);

  return (
    <ReviewShell
      hasConnection={!!connection}
      initialCandidates={candidates ?? []}
      initialAutoPosted={autoPosted ?? []}
      userEmail={user.email ?? ""}
      isPro={!!activePayment}
    />
  );
}
