import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_REGION } from "@/lib/regions";

/**
 * The user's resolved locale/currency settings. Read from user_profiles, but
 * ALWAYS resolvable: a missing row, a missing column value, or a not-yet-applied
 * migration all fall back to the Singapore home-market defaults, so every caller
 * gets a complete profile and nothing downstream has to null-check.
 */
export type UserProfile = {
  country: string | null;
  currency: string;
  locale: string;
  timezone: string;
  onboarded: boolean;
  /**
   * True only when the table EXISTS but this user has no completed profile yet
   * — i.e. it's safe to send them through onboarding. It is deliberately false
   * when the table is missing (pre-migration 0021) or the read errored, so the
   * onboarding gate can never trap a user before the migration is applied.
   */
  needsOnboarding: boolean;
};

const DEFAULTS = {
  country: null,
  currency: DEFAULT_REGION.currency,
  locale: DEFAULT_REGION.locale,
  timezone: DEFAULT_REGION.timezone,
};

export const DEFAULT_PROFILE: UserProfile = {
  ...DEFAULTS,
  onboarded: false,
  needsOnboarding: false,
};

/**
 * Load the signed-in user's profile (RLS scopes the row to them). Never throws
 * and never returns null — degrades to home-market defaults when the table/row
 * is absent, which is exactly the state for existing users and for the window
 * before migration 0021 is applied.
 */
export async function getUserProfile(supabase: SupabaseClient): Promise<UserProfile> {
  let data: Record<string, unknown> | null = null;
  let error: unknown = null;
  try {
    const res = await supabase.from("user_profiles").select().maybeSingle();
    data = res.data as Record<string, unknown> | null;
    error = res.error;
  } catch (e) {
    error = e;
  }

  // Table missing (pre-migration) or a transient read error: run on defaults and
  // never gate — the app behaves exactly as it did before this feature existed.
  if (error) return DEFAULT_PROFILE;

  // Table exists but no row yet: this user should go through onboarding.
  if (!data) return { ...DEFAULTS, onboarded: false, needsOnboarding: true };

  const onboarded = !!data.onboarded_at;
  return {
    country: (data.country as string) ?? null,
    currency: (data.base_currency as string) ?? DEFAULT_REGION.currency,
    locale: (data.locale as string) ?? DEFAULT_REGION.locale,
    timezone: (data.timezone as string) ?? DEFAULT_REGION.timezone,
    onboarded,
    needsOnboarding: !onboarded,
  };
}

/**
 * Just the base currency for a specific user, by explicit id — for server paths
 * that run with a service-role client (email/cron scans) where RLS can't scope
 * the row for us. Degrades to SGD when the table/row is absent.
 */
export async function getBaseCurrency(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("base_currency")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data?.base_currency) return DEFAULT_REGION.currency;
    return data.base_currency as string;
  } catch {
    return DEFAULT_REGION.currency;
  }
}
