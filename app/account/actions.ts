"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { regionForCountry, CURRENCIES } from "@/lib/regions";
import { transactionsToCsv } from "@/lib/exportCsv";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Requests a login-email change. Supabase emails a confirmation link to the
 * new address before the change actually takes effect, so `user.email` won't
 * reflect it until the user clicks that link — the caller shows a toast
 * saying so rather than optimistically updating anything.
 */
export async function updateEmail(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const email = formData.get("email");
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  if (email.trim().toLowerCase() === (user.email ?? "").toLowerCase()) {
    return { error: "That's already your email." };
  }

  const { error } = await supabase.auth.updateUser({ email: email.trim() });
  if (error) {
    console.error("[updateEmail]", error);
    return { error: "Could not update your email — please try again." };
  }

  await logAudit(supabase, {
    action: "account.email_change_requested",
    entityType: "user",
    entityId: user.id,
    payload: {},
    riskLevel: "medium",
    userId: user.id,
  });

  return { success: true };
}

/**
 * Builds the CSV on demand so /settings doesn't have to ship the user's whole
 * transaction history on every page load just in case they click Export.
 */
export async function exportTransactionsCsv(): Promise<
  { csv: string; count: number } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const [{ data: transactions, error }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select().order("date", { ascending: false }),
    supabase.from("categories").select(),
  ]);
  if (error) {
    console.error("[exportTransactionsCsv]", error);
    return { error: "Could not load your transactions — please try again." };
  }

  return {
    csv: transactionsToCsv(transactions ?? [], categories ?? []),
    count: (transactions ?? []).length,
  };
}

export async function changePassword(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof password !== "string" || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[changePassword]", error);
    return { error: "Could not update your password — please try again." };
  }

  await logAudit(supabase, {
    action: "account.password_changed",
    entityType: "user",
    entityId: user.id,
    payload: {},
    riskLevel: "medium",
    userId: user.id,
  });

  return { success: true };
}

// User-scoped tables cleared on account deletion. Order avoids FK issues
// (votes before requests). categories only removes the user's own custom rows,
// never the shared system categories (user_id is null there).
const USER_TABLES = [
  "feature_votes",
  "feature_requests",
  "email_transaction_candidates",
  "email_connections",
  "trusted_senders",
  "sms_tokens",
  "category_budgets",
  "fortune_goals",
  "payments",
  "audit_logs",
  "transactions",
  "categories",
];

/**
 * Delete the CURRENT user's account and all their data. The user id comes only
 * from the server session — never from the client — so a request can only ever
 * erase the caller's own account. Requires typing DELETE to confirm.
 */
export async function deleteAccount(formData: FormData): Promise<{ error: string }> {
  const confirm = formData.get("confirm");
  if (confirm !== "DELETE") {
    return { error: 'Type DELETE to confirm.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const admin = createAdminClient();
  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) {
      console.error(`[deleteAccount] ${table}`, error);
      return { error: "Could not delete your data — please try again." };
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("[deleteAccount] auth", delErr);
    return { error: "Could not delete your account — please try again." };
  }

  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Update the user's region/currency after onboarding — for anyone who picked
 * the wrong country at setup. Country drives locale + timezone; currency
 * defaults to the country's but may be overridden. This relabels how money is
 * shown; it does NOT convert amounts already logged (the caller warns about
 * that). Upsert keeps it a single owner-only row.
 */
export async function updateRegion(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const country = String(formData.get("country") ?? "").toUpperCase();
  const currencyRaw = String(formData.get("currency") ?? "").toUpperCase();
  const region = regionForCountry(country);
  if (!region) return { error: "Please choose a country." };
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
    console.error("[updateRegion]", error);
    return { error: "Could not save — please try again." };
  }

  await logAudit(supabase, {
    action: "profile.region_updated",
    entityType: "user_profile",
    entityId: user.id,
    payload: { country: region.code, currency },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  revalidatePath("/settings");
  return { success: true };
}
