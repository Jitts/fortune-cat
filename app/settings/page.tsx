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

  const [
    { data: connections },
    { data: trustedSenders },
    { count: pendingReviewCount },
    { data: activePayment },
    { data: smsToken },
  ] = await Promise.all([
    supabase
      .from("email_connections")
      .select("id, email, imap_host, imap_port, last_scanned_at, created_at, oldest_scanned_seq, auth_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("trusted_senders").select().eq("user_id", user.id).order("pattern"),
    supabase
      .from("email_transaction_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle(),
    supabase
      .from("sms_tokens")
      .select("token, created_at, last_received_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <SettingsShell
      initialConnections={connections ?? []}
      initialTrustedSenders={trustedSenders ?? []}
      initialSmsToken={smsToken ?? null}
      pendingReviewCount={pendingReviewCount ?? 0}
      userEmail={user.email ?? ""}
      isPro={!!activePayment}
      msOAuthAvailable={!!(process.env.MICROSOFT_OAUTH_CLIENT_ID && process.env.MICROSOFT_OAUTH_CLIENT_SECRET)}
    />
  );
}
