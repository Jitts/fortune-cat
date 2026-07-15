"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { ManualRecurringBill } from "@/lib/types";

type ActionResult =
  | { data: ManualRecurringBill; error?: undefined }
  | { data?: undefined; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function addManualBill(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  const name = formData.get("name");
  const amountRaw = formData.get("amount");
  const cadence = formData.get("cadence");
  const type = formData.get("type");
  const nextDueDate = formData.get("next_due_date");
  const accountTag = formData.get("account_tag");

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Give it a name." };
  }
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }
  if (cadence !== "weekly" && cadence !== "monthly") {
    return { error: "Choose a cadence." };
  }
  if (typeof nextDueDate !== "string" || !nextDueDate) {
    return { error: "Choose the next due date." };
  }

  const { data, error } = await supabase
    .from("manual_recurring_bills")
    .insert({
      user_id: user.id,
      name: name.trim().slice(0, 80),
      type: type === "income" ? "income" : "expense",
      amount,
      cadence,
      next_due_date: nextDueDate,
      account_tag: typeof accountTag === "string" && accountTag.trim() ? accountTag.trim().slice(0, 40) : null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[addManualBill]", error);
    return { error: "Could not save — please try again." };
  }

  await logAudit(supabase, {
    action: "manual_bill.created",
    entityType: "manual_recurring_bill",
    entityId: data.id,
    payload: { cadence, amount },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data };
}

export async function deleteManualBill(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  const { error } = await supabase.from("manual_recurring_bills").delete().eq("id", id);
  if (error) {
    console.error("[deleteManualBill]", error);
    return { error: "Could not delete — please try again." };
  }

  await logAudit(supabase, {
    action: "manual_bill.deleted",
    entityType: "manual_recurring_bill",
    entityId: id,
    payload: {},
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return {};
}
