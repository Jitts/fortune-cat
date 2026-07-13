"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAuthRateLimit, type AuthScope } from "@/lib/rateLimit";

type AuthResult = { error: string };

const THROTTLED_MESSAGE =
  "Too many attempts. Please wait a few minutes and try again.";

function validate(email: unknown, password: unknown): AuthResult | null {
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (typeof password !== "string" || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  return null;
}

/** Best-effort client IP from the proxy chain; "unknown" behind no proxy. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Returns the throttle error if any of the given buckets is over its limit. */
async function throttle(
  buckets: ReadonlyArray<readonly [AuthScope, string]>,
): Promise<AuthResult | null> {
  for (const [scope, identifier] of buckets) {
    const { limited } = await checkAuthRateLimit(scope, identifier);
    if (limited) return { error: THROTTLED_MESSAGE };
  }
  return null;
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const invalid = validate(email, password);
  if (invalid) return invalid;

  const throttled = await throttle([["signup_ip", `ip:${await clientIp()}`]]);
  if (throttled) return throttled;

  const admin = createAdminClient();

  // Provision the user pre-confirmed so the demo has no email round-trip.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: email as string,
    password: password as string,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    if (createErr?.code === "email_exists" || /already/i.test(createErr?.message ?? "")) {
      return { error: "That email is already registered — try logging in." };
    }
    console.error("[signUpAction]", createErr);
    return { error: "Could not create account — please try again." };
  }

  // New accounts start with a clean, empty dashboard — no seeded transactions.

  // Establish the session cookie via the SSR client.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: email as string,
    password: password as string,
  });
  if (signInErr) {
    console.error("[signUpAction] sign-in after create failed", signInErr);
    return { error: "Account created — please log in." };
  }

  redirect("/app");
}

export async function loginAction(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const invalid = validate(email, password);
  if (invalid) return invalid;

  // Brute-force defence: throttle per-account (password guessing) and per-IP
  // (credential spraying) before we ever check the password.
  const throttled = await throttle([
    ["login", email as string],
    ["login_ip", `ip:${await clientIp()}`],
  ]);
  if (throttled) return throttled;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email as string,
    password: password as string,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Always returns the same generic success message regardless of whether the
// email is registered, so this can't be used to enumerate accounts.
export async function requestPasswordReset(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  // Throttle reset emails per-account and per-IP to prevent inbox-bombing.
  const throttled = await throttle([
    ["reset", email],
    ["signup_ip", `ip:${await clientIp()}`],
  ]);
  if (throttled) return throttled;

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  if (error && error.code !== "user_not_found") {
    console.error("[requestPasswordReset]", error);
    return { error: "Could not send the reset email — please try again." };
  }

  return { success: true };
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your reset link has expired — request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[updatePassword]", error);
    return { error: "Could not update your password — please try again." };
  }

  redirect("/app");
}
