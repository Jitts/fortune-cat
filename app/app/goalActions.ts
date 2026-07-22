"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { FortuneGoal } from "@/lib/types";

type GoalResult =
  | { data: FortuneGoal; error?: undefined }
  | { data?: undefined; error: string };

function parseAmount(raw: FormDataEntryValue | null): number | null {
  const n = Number(raw);
  if (!raw || Number.isNaN(n)) return null;
  return n;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Records a durable achievement the first time a goal's saved amount reaches
 * its target. Idempotent: the partial unique index on goal_id (migration 0026)
 * plus this existence check mean repeated boosts past 100% never double-record.
 * Best-effort — a ledger hiccup must never fail the user's save.
 */
async function recordAchievementIfMet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goal: FortuneGoal,
) {
  if (Number(goal.saved_amount) < Number(goal.target_amount)) return;
  try {
    const { data: existing } = await supabase
      .from("goal_achievements")
      .select("id")
      .eq("goal_id", goal.id)
      .maybeSingle();
    if (existing) return;

    await supabase.from("goal_achievements").insert({
      user_id: userId,
      goal_id: goal.id,
      name: goal.name,
      kind: goal.kind,
      target_amount: goal.target_amount,
    });
  } catch (err) {
    console.error("[recordAchievementIfMet]", err);
  }
}

export async function createGoal(formData: FormData): Promise<GoalResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  const name = formData.get("name");
  const kind = formData.get("kind") === "emergency" ? "emergency" : "savings";
  const target = parseAmount(formData.get("target_amount"));
  const saved = parseAmount(formData.get("saved_amount")) ?? 0;
  const targetDate = formData.get("target_date");

  if (!name || typeof name !== "string" || !name.trim()) {
    return { error: "Give your goal a name." };
  }
  if (target == null || target <= 0) {
    return { error: "Set a target greater than 0." };
  }
  if (saved < 0) {
    return { error: "Saved amount can't be negative." };
  }

  const { data, error } = await supabase
    .from("fortune_goals")
    .insert({
      user_id: user.id,
      name: name.trim().slice(0, 80),
      kind,
      target_amount: target,
      saved_amount: saved,
      target_date: typeof targetDate === "string" && targetDate ? targetDate : null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[createGoal]", error);
    return { error: "Could not create the goal — please try again." };
  }

  await logAudit(supabase, {
    action: "fortune_goal.created",
    entityType: "fortune_goal",
    entityId: data.id,
    payload: { kind, target_amount: target },
    riskLevel: "low",
    userId: user.id,
  });

  // A goal created already funded (saved ≥ target) counts as met on day one.
  await recordAchievementIfMet(supabase, user.id, data);

  revalidatePath("/app");
  return { data };
}

export async function updateGoal(id: string, formData: FormData): Promise<GoalResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  const name = formData.get("name");
  const target = parseAmount(formData.get("target_amount"));
  const targetDate = formData.get("target_date");

  if (!name || typeof name !== "string" || !name.trim()) {
    return { error: "Give your goal a name." };
  }
  if (target == null || target <= 0) {
    return { error: "Set a target greater than 0." };
  }

  const { data, error } = await supabase
    .from("fortune_goals")
    .update({
      name: name.trim().slice(0, 80),
      target_amount: target,
      target_date: typeof targetDate === "string" && targetDate ? targetDate : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[updateGoal]", error);
    return { error: "Could not update the goal — please try again." };
  }

  // Lowering the target below what's already saved meets the goal too.
  await recordAchievementIfMet(supabase, user.id, data);

  revalidatePath("/app");
  return { data };
}

/** Boost Savings: add (or, with a negative amount, withdraw) toward a goal. */
export async function contributeToGoal(id: string, amount: number): Promise<GoalResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  if (!Number.isFinite(amount) || amount === 0) {
    return { error: "Enter an amount to add." };
  }

  const { data: goal } = await supabase
    .from("fortune_goals")
    .select("saved_amount")
    .eq("id", id)
    .single();
  if (!goal) return { error: "Could not find that goal." };

  const next = Math.max(0, Number(goal.saved_amount) + amount);

  const { data, error } = await supabase
    .from("fortune_goals")
    .update({ saved_amount: next })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[contributeToGoal]", error);
    return { error: "Could not update — please try again." };
  }

  await logAudit(supabase, {
    action: "fortune_goal.contributed",
    entityType: "fortune_goal",
    entityId: id,
    payload: { amount, saved_amount: next },
    riskLevel: "low",
    userId: user.id,
  });

  // The usual path to a win: a boost tips saved over the target.
  await recordAchievementIfMet(supabase, user.id, data);

  revalidatePath("/app");
  return { data };
}

export async function deleteGoal(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Please log in." };

  const { error } = await supabase.from("fortune_goals").delete().eq("id", id);
  if (error) {
    console.error("[deleteGoal]", error);
    return { error: "Could not delete — please try again." };
  }

  await logAudit(supabase, {
    action: "fortune_goal.deleted",
    entityType: "fortune_goal",
    entityId: id,
    payload: {},
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return {};
}
