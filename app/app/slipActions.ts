"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { computeSlip } from "@/lib/fortune";
import type { Transaction, FortuneSlipRow } from "@/lib/types";

type SlipResult =
  | { data: FortuneSlipRow; error?: undefined }
  | { data?: undefined; error: string };

/** Local (SG) calendar date as yyyy-mm-dd — the slip is keyed to the user's day. */
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
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

  const { data: transactions } = await supabase
    .from("transactions")
    .select()
    .order("date", { ascending: false });

  const slip = computeSlip((transactions ?? []) as Transaction[]);
  const slipDate = todayIso();

  const { data, error } = await supabase
    .from("fortune_slips")
    .upsert(
      {
        user_id: user.id,
        slip_date: slipDate,
        severity: slip.severity,
        fortune_word: slip.fortuneWord,
        headline: slip.headline,
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
