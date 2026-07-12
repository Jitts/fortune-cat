"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { CategoryBudget } from "@/lib/types";

type BudgetResult =
  | { data: CategoryBudget; error?: undefined }
  | { data?: undefined; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Set (or change) the monthly limit for a category — one budget per category. */
export async function setBudget(categoryId: string, monthlyLimit: number): Promise<BudgetResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  if (!categoryId || typeof categoryId !== "string") {
    return { error: "Choose a category." };
  }
  if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
    return { error: "Set a limit greater than 0." };
  }

  const { data, error } = await supabase
    .from("category_budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, monthly_limit: monthlyLimit },
      { onConflict: "user_id, category_id" },
    )
    .select()
    .single();

  if (error || !data) {
    console.error("[setBudget]", error);
    return { error: "Could not save the budget — please try again." };
  }

  await logAudit(supabase, {
    action: "category_budget.set",
    entityType: "category_budget",
    entityId: data.id,
    payload: { category_id: categoryId, monthly_limit: monthlyLimit },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data };
}

export async function removeBudget(categoryId: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  const { error } = await supabase
    .from("category_budgets")
    .delete()
    .eq("category_id", categoryId);

  if (error) {
    console.error("[removeBudget]", error);
    return { error: "Could not remove — please try again." };
  }

  revalidatePath("/app");
  return {};
}
