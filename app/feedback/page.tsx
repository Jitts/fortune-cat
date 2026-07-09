import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedbackShell from "./FeedbackShell";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: requests }, { data: myVotes }] = await Promise.all([
    supabase.from("feature_requests").select().order("created_at"),
    supabase.from("feature_votes").select("feature_request_id").eq("user_id", user.id),
  ]);

  const votedIds = new Set((myVotes ?? []).map((v) => v.feature_request_id));
  const withVoteState = (requests ?? []).map((r) => ({ ...r, hasVoted: votedIds.has(r.id) }));

  return <FeedbackShell initialRequests={withVoteState} userEmail={user.email ?? ""} />;
}
