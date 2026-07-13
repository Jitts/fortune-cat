"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

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
