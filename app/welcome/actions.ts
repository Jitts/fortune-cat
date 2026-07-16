"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { regionForCountry, CURRENCIES } from "@/lib/regions";

/**
 * Save the onboarding choice: country sets the locale + timezone, and its
 * currency by default — but the user may override the currency if the default
 * is wrong for them. Upserts one row per user (user_id is the PK), stamps
 * onboarded_at, then drops them into the app.
 */
export async function saveProfile(formData: FormData): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const country = String(formData.get("country") ?? "").toUpperCase();
  const currencyRaw = String(formData.get("currency") ?? "").toUpperCase();

  const region = regionForCountry(country);
  if (!region) return { error: "Please choose your country." };

  // Currency defaults to the country's own; an override must be a currency we
  // actually know (so formatting + FX stay defined). Otherwise snap back.
  const currency = CURRENCIES.includes(currencyRaw) ? currencyRaw : region.currency;

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      country: region.code,
      base_currency: currency,
      locale: region.locale,
      timezone: region.timezone,
      onboarded_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[saveProfile]", error);
    return { error: "Could not save your choice — please try again." };
  }

  await logAudit(supabase, {
    action: "profile.onboarded",
    entityType: "user_profile",
    entityId: user.id,
    payload: { country: region.code, currency },
    riskLevel: "low",
    userId: user.id,
  });

  redirect("/app");
}
