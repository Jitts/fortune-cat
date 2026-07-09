import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted server
 * contexts that have no user session (Stripe webhook) or that must act across
 * users (sign-up provisioning). Never import this into a client component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  // Strip any stray BOM/whitespace so the value is always a valid HTTP header.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/^﻿/, "").trim();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
