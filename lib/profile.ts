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

/** The subset of a profile that server-side capture paths need. */
export type CaptureProfile = {
  currency: string;
  locale: string;
  timezone: string;
};

/**
 * Profile settings for a specific user, by explicit id — for server paths that
 * run with a service-role client (email/cron scans, the SMS webhook) where RLS
 * can't scope the row for us. Degrades to the home-market defaults when the
 * table/row is absent.
 *
 * Capture needs all three: currency decides how an unmarked amount is booked,
 * and locale/timezone decide how the resulting review text reads back.
 */
export async function getProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<CaptureProfile> {
  const fallback: CaptureProfile = {
    currency: DEFAULT_REGION.currency,
    locale: DEFAULT_REGION.locale,
    timezone: DEFAULT_REGION.timezone,
  };
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("base_currency, locale, timezone")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return fallback;
    return {
      currency: (data.base_currency as string) ?? fallback.currency,
      locale: (data.locale as string) ?? fallback.locale,
      timezone: (data.timezone as string) ?? fallback.timezone,
    };
  } catch {
    return fallback;
  }
}

/** Just the base currency for a specific user. See getProfileByUserId. */
export async function getBaseCurrency(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  return (await getProfileByUserId(supabase, userId)).currency;
}
