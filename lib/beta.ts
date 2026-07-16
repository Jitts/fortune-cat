// Beta pricing: while true, Pro is free — "Go Pro" grants Pro directly
// (service-role payments row, $0) instead of opening Stripe Checkout, and the
// marketing surfaces say so. Flip to false to restore the $9 paywall; no other
// code changes needed.
export const FREE_PRO_BETA = true;
