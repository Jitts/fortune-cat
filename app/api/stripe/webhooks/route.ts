import { constructWebhookEvent } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * POST /api/stripe/webhooks
 *
 * Register this URL in the Stripe dashboard: Developers → Webhooks → add
 * endpoint → /api/stripe/webhooks, listening for `checkout.session.completed`.
 *
 * Runs with the service-role key because Stripe calls us with no user session;
 * the owning user comes from the checkout session metadata.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("[stripe/webhooks] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? null;

      const { data: payment, error } = await supabase
        .from("payments")
        .update({
          status: "active",
          user_id: userId,
          stripe_customer_id: (session.customer as string) ?? null,
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id)
        .select()
        .single();

      if (error) {
        console.error("[stripe/webhooks] failed to update payment:", error);
      } else if (payment) {
        await logAudit(supabase, {
          action: "payment.confirmed",
          entityType: "payment",
          entityId: payment.id,
          payload: { stripe_session_id: session.id },
          riskLevel: "high",
          userId,
        });
      }
    }
  } catch (err) {
    console.error(`[stripe/webhooks] error handling ${event.type}:`, err);
    // Return 200 anyway — Stripe retries on 5xx, not on handler errors.
  }

  return NextResponse.json({ received: true });
}
