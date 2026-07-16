import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProCheckoutSession, PRO_PRICE_CENTS } from "@/lib/stripe";
import { FREE_PRO_BETA } from "@/lib/beta";
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

    // Free beta: grant Pro directly — no Stripe session, $0 recorded. The row
    // is written with the service role because users can only insert 'pending'
    // (migration 0023); 'active' is reserved for the webhook and this grant.
    if (FREE_PRO_BETA) {
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const admin = createAdminClient();
        const { data: betaPayment, error } = await admin
          .from("payments")
          .insert({
            user_id: user.id,
            stripe_session_id: `beta_${user.id}`,
            status: "active",
            plan: "pro",
            amount_cents: 0,
            currency: "usd",
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error || !betaPayment) {
          console.error("[stripe/checkout] beta grant failed:", error);
          return NextResponse.json(
            { error: "Could not unlock Pro — please try again." },
            { status: 500 },
          );
        }

        await logAudit(supabase, {
          action: "payment.beta_granted",
          entityType: "payment",
          entityId: betaPayment.id,
          payload: { amount_cents: 0, reason: "free_pro_beta" },
          riskLevel: "high",
          userId: user.id,
        });
      }

      return NextResponse.json({ url: `${origin}/app?checkout=success` });
    }

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
