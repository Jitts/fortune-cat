import Stripe from "stripe";

/**
 * Stripe client.
 *
 * Works in two modes — controlled entirely by env vars, no code changes needed:
 *
 * STANDALONE (your own Stripe account):
 *   STRIPE_SECRET_KEY = sk_live_xxx   (your secret key)
 *   STRIPE_CONNECT_ACCOUNT_ID not set
 *   STRIPE_PLATFORM_FEE_PERCENT not set
 *
 * PLATFORM (provisioned through Vibe Launchpad — platform takes a cut):
 *   STRIPE_SECRET_KEY = sk_live_xxx   (platform's key OR your connected account key)
 *   STRIPE_CONNECT_ACCOUNT_ID = acct_xxx   (your connected Stripe account)
 *   STRIPE_PLATFORM_FEE_PERCENT = 1   (platform takes 1% of every transaction)
 */
// Fall back to a placeholder so `new Stripe()` doesn't throw at build time
// when STRIPE_SECRET_KEY isn't configured. Real Stripe calls still require a
// valid key at runtime — this only keeps `next build` from crashing while
// collecting page data for projects that don't use Stripe.
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder_build_only",
  {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  },
);

// Set when this app was provisioned through a Connect platform
export const CONNECT_ACCOUNT_ID = process.env.STRIPE_CONNECT_ACCOUNT_ID as
  | string
  | undefined;

// Platform fee percentage (0–100). Only active when CONNECT_ACCOUNT_ID is set.
export const PLATFORM_FEE_PERCENT = CONNECT_ACCOUNT_ID
  ? Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? "0")
  : 0;

// Pass this to Stripe API calls when running through a Connect platform
export const stripeAccountOptions = (): Stripe.RequestOptions | undefined =>
  CONNECT_ACCOUNT_ID ? { stripeAccount: CONNECT_ACCOUNT_ID } : undefined;

// ─── Fortune Cat Pro — one-time checkout ──────────────────────────────────────

export const PRO_PRICE_CENTS = 900; // $9.00 one-time

export async function createProCheckoutSession({
  successUrl,
  cancelUrl,
}: {
  successUrl: string;
  cancelUrl: string;
}) {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: PRO_PRICE_CENTS,
          product_data: {
            name: "Fortune Cat Pro",
            description: "Unlock full transaction history",
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(PLATFORM_FEE_PERCENT > 0
      ? {
          payment_intent_data: {
            application_fee_amount: Math.round(
              (PRO_PRICE_CENTS * PLATFORM_FEE_PERCENT) / 100,
            ),
          },
        }
      : {}),
  };

  return stripe.checkout.sessions.create(params, stripeAccountOptions());
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export function constructWebhookEvent(payload: string, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );
}
