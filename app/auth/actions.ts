"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AuthResult = { error: string };

// Starter transactions cloned for each new account so the app isn't empty on
// first login (relative to today; references the shared system categories).
const STARTER_ROWS = [
  { type: "income", amount: 3200.0, category: "a1000000-0000-0000-0000-000000000004", daysAgo: 20, note: "Monthly salary" },
  { type: "expense", amount: 48.5, category: "a1000000-0000-0000-0000-000000000001", daysAgo: 15, note: "Dinner with friends" },
  { type: "expense", amount: 22.0, category: "a1000000-0000-0000-0000-000000000002", daysAgo: 12, note: "Monthly transit pass" },
  { type: "expense", amount: 134.99, category: "a1000000-0000-0000-0000-000000000003", daysAgo: 8, note: "New headphones" },
  { type: "expense", amount: 65.0, category: "a1000000-0000-0000-0000-000000000005", daysAgo: 5, note: "Electricity bill" },
  { type: "expense", amount: 19.99, category: "a1000000-0000-0000-0000-000000000006", daysAgo: 2, note: "Streaming subscription" },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function validate(email: unknown, password: unknown): AuthResult | null {
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (typeof password !== "string" || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  return null;
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email");
  const password = formData.get("password");
  const invalid = validate(email, password);
  if (invalid) return invalid;

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

  // Seed starter transactions for the new user.
  const rows = STARTER_ROWS.map((r) => ({
    user_id: created.user.id,
    type: r.type,
    amount: r.amount,
    category_id: r.category,
    date: isoDaysAgo(r.daysAgo),
    note: r.note,
  }));
  await admin.from("transactions").insert(rows);

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
