import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Brute-force defence for the auth surface (login / signup / password reset).
 *
 * Attempts are recorded as append-only rows in `audit_logs`
 * (action = AUTH_ATTEMPT_ACTION, entity_type = a hashed bucket key) so no schema
 * change is required and the log doubles as an authentication audit trail. The
 * service-role client is used so the counter is not itself subject to RLS and
 * can never be read or forged by an anonymous caller.
 *
 * The identifier is hashed (never stored in plaintext) so raw emails / IPs do
 * not leak into the audit log.
 *
 * NOTE: the constants and bucket format below are the contract exercised by
 * `tests/security.mjs` (brute-force test). Keep them in sync.
 */

export const AUTH_ATTEMPT_ACTION = "auth.attempt";

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
 * Fails open on infrastructure errors (logs loudly) so a transient audit-log
 * hiccup can't lock every user out of a personal finance app.
 */
export async function checkAuthRateLimit(
  scope: AuthScope,
  identifier: string,
): Promise<RateLimitResult> {
  const { max, windowSeconds } = AUTH_LIMITS[scope];
  const bucket = rateLimitBucket(scope, identifier);
  const admin = createAdminClient();
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", AUTH_ATTEMPT_ACTION)
    .eq("entity_type", bucket)
    .gte("created_at", since);

  if (error) {
    console.error("[rateLimit] count failed — failing open", error);
    return { limited: false, retryAfterSeconds: 0 };
  }

  if ((count ?? 0) >= max) {
    return { limited: true, retryAfterSeconds: windowSeconds };
  }

  const { error: insertError } = await admin.from("audit_logs").insert({
    action: AUTH_ATTEMPT_ACTION,
    entity_type: bucket,
    payload: { scope },
    risk_level: "low",
    user_id: null,
  });
  if (insertError) {
    console.error("[rateLimit] insert failed — failing open", insertError);
  }

  return { limited: false, retryAfterSeconds: 0 };
}
