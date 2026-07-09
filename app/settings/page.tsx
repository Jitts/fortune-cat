import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsShell from "./SettingsShell";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: connection }, { data: candidates }] = await Promise.all([
    supabase
      .from("email_connections")
      .select("id, email, imap_host, imap_port, last_scanned_at, created_at, oldest_scanned_seq")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("email_transaction_candidates")
      .select()
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("email_date", { ascending: false }),
  ]);

  return (
    <SettingsShell
      initialConnection={connection ?? null}
      initialCandidates={candidates ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
