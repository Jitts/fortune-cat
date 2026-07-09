import { createClient } from "@/lib/supabase/server";
import { createProCheckoutSession, PRO_PRICE_CENTS } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for the one-time "Fortune Cat Pro" purchase
 * for the signed-in user and records a pending `payments` row (owned by that
 * user) keyed by the Stripe session id. The webhook flips it to `active` once
 * checkout.session.completed fires.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const session = await createProCheckoutSession({
      userId: user.id,
      successUrl: `${origin}/app?checkout=success`,
      cancelUrl: `${origin}/upgrade?checkout=cancelled`,
    });

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        status: "pending",
        plan: "pro",
        amount_cents: PRO_PRICE_CENTS,
        currency: "usd",
      })
      .select()
      .single();

    if (error) {
      console.error("[stripe/checkout] failed to record pending payment:", error);
    } else {
      await logAudit(supabase, {
        action: "payment.initiated",
        entityType: "payment",
        entityId: payment.id,
        payload: { stripe_session_id: session.id, amount_cents: PRO_PRICE_CENTS },
        riskLevel: "high",
        userId: user.id,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      { error: "Could not start checkout — please try again." },
      { status: 500 },
    );
  }
}
