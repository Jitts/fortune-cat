"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { SubscriptionDecision, SubscriptionStatus } from "@/lib/types";

type DecisionResult =
  | { data: SubscriptionDecision; error?: undefined }
  | { data?: undefined; error: string };

const STATUSES: SubscriptionStatus[] = ["keep", "cancelling", "cancelled"];

/**
 * Record (or change) the verdict on a detected subscription. Upserts on
 * (user_id, merchant_key) so a merchant has exactly one live decision; the
 * monthly amount is snapshotted for the "money freed" tally.
 */
export async function setSubscriptionDecision(
  merchantKey: string,
  status: SubscriptionStatus,
  monthlyAmount: number | null,
): Promise<DecisionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  if (!merchantKey || typeof merchantKey !== "string") return { error: "Unknown subscription." };
  if (!STATUSES.includes(status)) return { error: "Invalid decision." };

  const { data, error } = await supabase
    .from("subscription_decisions")
    .upsert(
      {
        user_id: user.id,
        merchant_key: merchantKey.slice(0, 120),
        status,
        monthly_amount:
          monthlyAmount != null && Number.isFinite(monthlyAmount) ? monthlyAmount : null,
      },
      { onConflict: "user_id,merchant_key" },
    )
    .select()
    .single();

  if (error || !data) {
    console.error("[setSubscriptionDecision]", error);
    return { error: "Could not save — please try again." };
  }

  await logAudit(supabase, {
    action: "subscription_decision.set",
    entityType: "subscription_decision",
    entityId: data.id,
    payload: { merchant_key: merchantKey, status },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data: data as SubscriptionDecision };
}
