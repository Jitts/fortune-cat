import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/profile";
import SettingsShell from "./SettingsShell";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // One parallel batch — no serial follow-up queries, and no bulk data (the
  // CSV export fetches transactions on demand via exportTransactionsCsv).
  const [
    profile,
    [
      { data: connections },
      { data: trustedSenders },
      { data: blockedSenders },
      { count: pendingReviewCount },
      { data: activePayment },
      { data: smsToken },
      { data: featureRequests },
      { data: myVotes },
    ],
  ] = await Promise.all([
    getUserProfile(supabase),
    Promise.all([
    supabase
      .from("email_connections")
      .select("id, email, imap_host, imap_port, last_scanned_at, created_at, oldest_scanned_seq, auth_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("trusted_senders").select().eq("user_id", user.id).order("pattern"),
    supabase.from("blocked_senders").select().eq("user_id", user.id).order("pattern"),
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
    supabase.from("feature_requests").select().order("created_at"),
    supabase.from("feature_votes").select("feature_request_id").eq("user_id", user.id),
    ]),
  ]);

  const votedIds = new Set((myVotes ?? []).map((v) => v.feature_request_id));
  const requestsWithVoteState = (featureRequests ?? []).map((r) => ({ ...r, hasVoted: votedIds.has(r.id) }));

  return (
    <SettingsShell
      initialConnections={connections ?? []}
      initialTrustedSenders={trustedSenders ?? []}
      initialBlockedSenders={blockedSenders ?? []}
      initialSmsToken={smsToken ?? null}
      pendingReviewCount={pendingReviewCount ?? 0}
      userEmail={user.email ?? ""}
      isPro={!!activePayment}
      msOAuthAvailable={!!(process.env.MICROSOFT_OAUTH_CLIENT_ID && process.env.MICROSOFT_OAUTH_CLIENT_SECRET)}
      initialRequests={requestsWithVoteState}
      country={profile.country}
      currency={profile.currency}
    />
  );
}
