"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { computeSlip } from "@/lib/fortune";
import { getUserProfile } from "@/lib/profile";
import type { BalanceAnchor, Category, FortuneGoal, Transaction, FortuneSlipRow } from "@/lib/types";

type SlipResult =
  | { data: FortuneSlipRow; error?: undefined }
  | { data?: undefined; error: string };

/** The user's local calendar date as yyyy-mm-dd — the slip is keyed to their day. */
function todayIso(timeZone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

/**
 * Draw today's fortune. Deterministic: the face is computed server-side from the
 * user's own transactions, then upserted on (user_id, slip_date) so re-drawing
 * the same day is idempotent (never a duplicate, never a re-roll).
 */
export async function drawDailySlip(): Promise<SlipResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const profile = await getUserProfile(supabase);

  const [
    { data: transactions },
    { data: categories },
    { data: activePayment },
    { data: goals },
    { data: anchor },
  ] = await Promise.all([
    supabase.from("transactions").select().order("date", { ascending: false }),
    supabase.from("categories").select(),
    supabase.from("payments").select("id").eq("status", "active").limit(1).maybeSingle(),
    supabase.from("fortune_goals").select(),
    supabase.from("balance_anchors").select().order("anchored_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const slip = computeSlip(
    (transactions ?? []) as Transaction[],
    (categories ?? []) as Category[],
    !!activePayment,
    (goals ?? []) as FortuneGoal[],
    (anchor ?? null) as BalanceAnchor | null,
    profile.currency,
    profile.locale,
  );
  const slipDate = todayIso(profile.timezone);

  const { data, error } = await supabase
    .from("fortune_slips")
    .upsert(
      {
        user_id: user.id,
        slip_date: slipDate,
        severity: slip.severity,
        fortune_word: slip.fortuneWord,
        headline: slip.headline,
        detail: slip.detail,
        recommendation: slip.recommendation,
      },
      { onConflict: "user_id,slip_date" },
    )
    .select()
    .single();

  if (error || !data) {
    console.error("[drawDailySlip]", error);
    return { error: "Could not draw your fortune — please try again." };
  }

  await logAudit(supabase, {
    action: "fortune_slip.drawn",
    entityType: "fortune_slip",
    entityId: data.id,
    payload: { severity: slip.severity, slip_date: slipDate },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data: data as FortuneSlipRow };
}
