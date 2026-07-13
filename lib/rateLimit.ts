import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Brute-force defence for the auth surface (login / signup / password reset).
 *
 * Attempts are counted in the `rate_limit_events` table via the
 * `check_rate_limit()` Postgres function (migration 0013), called through the
 * service-role client. The function records the hit and reports whether the
 * bucket is now over its limit in one atomic call, and self-prunes old rows so
 * the table stays bounded. The table has RLS enabled with no policies and the
 * function is granted only to `service_role`, so neither can be read or forged
 * by an anonymous/authenticated caller.
 *
 * The identifier is hashed (never stored in plaintext) so raw emails / IPs do
 * not leak into the store.
 *
 * NOTE: the constants and bucket format below are the contract exercised by
 * `tests/security.mjs` (brute-force test). Keep them in sync.
 */

export const AUTH_LIMITS = {
  // Per-account login throttle — the classic single-account password-guessing
  // vector. 5 attempts / 15 min.
  login: { max: 5, windowSeconds: 900 },
  // Per-IP login throttle — catches spray attacks across many accounts.
  login_ip: { max: 30, windowSeconds: 900 },
  // Signup / reset are email-side effects; cap them to curb abuse.
  signup_ip: { max: 10, windowSeconds: 3600 },
  reset: { max: 3, windowSeconds: 3600 },
} as const;

export type AuthScope = keyof typeof AUTH_LIMITS;

/** Stable, privacy-preserving bucket key: `<scope>:<sha256(identifier)[:32]>`. */
export function rateLimitBucket(scope: AuthScope, identifier: string): string {
  const hash = createHash("sha256")
    .update(identifier.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
  return `${scope}:${hash}`;
}

export type RateLimitResult = { limited: boolean; retryAfterSeconds: number };

/**
 * Records one attempt for `(scope, identifier)` and reports whether the caller
 * is now over the limit. Call this BEFORE the expensive/authenticating step and
 * reject when `limited` is true.
 *
 * Fails open on infrastructure errors (logs loudly) so a transient DB hiccup
 * can't lock every user out of a personal finance app.
 */
export async function checkAuthRateLimit(
  scope: AuthScope,
  identifier: string,
): Promise<RateLimitResult> {
  const { max, windowSeconds } = AUTH_LIMITS[scope];
  const bucket = rateLimitBucket(scope, identifier);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_limit: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rateLimit] rpc failed — failing open", error);
    return { limited: false, retryAfterSeconds: 0 };
  }

  const limited = !!(data as { limited?: boolean } | null)?.limited;
  return { limited, retryAfterSeconds: limited ? windowSeconds : 0 };
}
