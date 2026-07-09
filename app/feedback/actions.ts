"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { FeatureRequest } from "@/lib/types";

type ActionResult =
  | { data: FeatureRequest; error?: undefined }
  | { data?: undefined; error: string };

export async function submitFeatureRequest(formData: FormData): Promise<ActionResult> {
  const title = formData.get("title");
  const description = formData.get("description");

  if (typeof title !== "string" || !title.trim()) {
    return { error: "Enter a short title for your idea." };
  }
  if (title.trim().length > 120) {
    return { error: "Keep the title under 120 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to submit a request." };

  const { data, error } = await supabase
    .from("feature_requests")
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[submitFeatureRequest]", error);
    return { error: "Could not submit — please try again." };
  }

  await logAudit(supabase, {
    action: "feature_request.created",
    entityType: "feature_request",
    entityId: data.id,
    payload: { title: data.title },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/feedback");
  return { data: { ...data, vote_count: 0, hasVoted: false } };
}

export async function toggleVote(
  featureRequestId: string,
): Promise<{ voteCount: number; hasVoted: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to vote." };

  const { data: existing } = await supabase
    .from("feature_votes")
    .select("id")
    .eq("feature_request_id", featureRequestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("feature_votes").delete().eq("id", existing.id);
    if (error) {
      console.error("[toggleVote] remove", error);
      return { error: "Could not update your vote — please try again." };
    }
    await logAudit(supabase, {
      action: "feature_request.unvoted",
      entityType: "feature_request",
      entityId: featureRequestId,
      payload: {},
      riskLevel: "low",
      userId: user.id,
    });
  } else {
    const { error } = await supabase
      .from("feature_votes")
      .insert({ feature_request_id: featureRequestId, user_id: user.id });
    if (error) {
      console.error("[toggleVote] add", error);
      return { error: "Could not update your vote — please try again." };
    }
    await logAudit(supabase, {
      action: "feature_request.voted",
      entityType: "feature_request",
      entityId: featureRequestId,
      payload: {},
      riskLevel: "low",
      userId: user.id,
    });
  }

  const { data: refreshed } = await supabase
    .from("feature_requests")
    .select("vote_count")
    .eq("id", featureRequestId)
    .single();

  revalidatePath("/feedback");
  return { voteCount: refreshed?.vote_count ?? 0, hasVoted: !existing };
}
