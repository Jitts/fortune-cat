import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/payments/status
 *
 * Lets the client poll for Pro status right after returning from Stripe
 * Checkout, since the webhook that flips `payments.status` to `active` can
 * land a moment after the checkout redirect.
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ isPro: !!data });
}
