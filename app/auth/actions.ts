"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AuthResult = { error: string };

// Starter transactions cloned for each new account so the app isn't empty on
// first login. Anchored to the current month (income first, then expenses
// through the month) so the balance, category breakdown, and savings-rate
// insight are all populated no matter what day the user signs up.
const STARTER_ROWS = [
  { type: "income", amount: 3200.0, category: "a1000000-0000-0000-0000-000000000004", day: 1, note: "Monthly salary" },
  { type: "expense", amount: 48.5, category: "a1000000-0000-0000-0000-000000000001", day: 2, note: "Dinner with friends" },
  { type: "expense", amount: 22.0, category: "a1000000-0000-0000-0000-000000000002", day: 4, note: "Monthly transit pass" },
  { type: "expense", amount: 134.99, category: "a1000000-0000-0000-0000-000000000003", day: 5, note: "New headphones" },
  { type: "expense", amount: 65.0, category: "a1000000-0000-0000-0000-000000000005", day: 7, note: "Electricity bill" },
  { type: "expense", amount: 19.99, category: "a1000000-0000-0000-0000-000000000006", day: 8, note: "Streaming subscription" },
];

// A date on the given day of the current month, clamped to today so no row is
// dated in the future. Built from local Y/M/D parts (no toISOString) to avoid
// a timezone shift moving a row into an adjacent day/month.
function dateInCurrentMonth(day: number): string {
  const now = new Date();
  const clamped = Math.min(day, now.getDate());
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${String(clamped).padStart(2, "0")}`;
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
    date: dateInCurrentMonth(r.day),
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
