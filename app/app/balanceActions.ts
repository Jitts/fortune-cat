"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { BalanceAnchor } from "@/lib/types";

type AnchorResult =
  | { data: BalanceAnchor; error?: undefined }
  | { data?: undefined; error: string };

/**
 * Reconcile: confirm the real account balance, upgrading Safe-to-Spend from
 * flow mode to the precise anchor mode. Each call inserts a NEW row (history
 * kept); the latest is the live anchor.
 */
export async function setBalanceAnchor(amount: number): Promise<AnchorResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Enter your current balance (0 or more)." };
  }

  const { data, error } = await supabase
    .from("balance_anchors")
    .insert({ user_id: user.id, balance: amount })
    .select()
    .single();

  if (error || !data) {
    console.error("[setBalanceAnchor]", error);
    return { error: "Could not save your balance — please try again." };
  }

  await logAudit(supabase, {
    action: "balance_anchor.set",
    entityType: "balance_anchor",
    entityId: data.id,
    payload: { balance: amount },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data: data as BalanceAnchor };
}
