"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { suggestCategory, TAG_SOURCE } from "@/lib/tagger";
import type { Transaction, TransactionType } from "@/lib/types";

type ActionResult =
  | { data: Transaction; error?: undefined }
  | { data?: undefined; error: string };

function parseTransactionForm(formData: FormData): { value: Partial<Transaction> } | { error: string } {
  const type = formData.get("type");
  const amountRaw = formData.get("amount");
  const categoryId = formData.get("category_id");
  const date = formData.get("date");
  const note = formData.get("note");

  if (type !== "expense" && type !== "income") {
    return { error: "Choose expense or income." };
  }
  const amount = Number(amountRaw);
  if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }
  if (!categoryId || typeof categoryId !== "string") {
    return { error: "Choose a category." };
  }
  if (!date || typeof date !== "string") {
    return { error: "Choose a date." };
  }

  return {
    value: {
      type: type as TransactionType,
      amount,
      category_id: categoryId,
      date,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    },
  };
}

export async function addTransaction(formData: FormData): Promise<ActionResult> {
  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to add a transaction." };

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...parsed.value, user_id: user.id })
    .select()
    .single();

  if (error || !data) {
    console.error("[addTransaction]", error);
    return { error: "Could not save — please try again." };
  }

  await logAudit(supabase, {
    action: "transaction.created",
    entityType: "transaction",
    entityId: data.id,
    payload: { after: data },
    riskLevel: "low",
    userId: user.id,
  });

  // Rule-based auto-tagging (Sprint 4). Runs inline — no external API — and
  // records the suggestion in the ai_category* fields for the user to review.
  const suggestion = suggestCategory(data.note, data.type);
  let tagged = data as Transaction;
  if (suggestion) {
    const { data: withTag } = await supabase
      .from("transactions")
      .update({
        ai_category: suggestion.category,
        ai_category_source: TAG_SOURCE,
        ai_category_confidence: suggestion.confidence,
        ai_category_review_status: "unreviewed",
      })
      .eq("id", data.id)
      .select()
      .single();
    if (withTag) tagged = withTag;

    await logAudit(supabase, {
      action: "ai_tag.suggested",
      entityType: "transaction",
      entityId: data.id,
      payload: { suggested: suggestion.category, confidence: suggestion.confidence, source: TAG_SOURCE },
      riskLevel: "low",
      userId: user.id,
    });
  }

  revalidatePath("/app");
  return { data: tagged };
}

export async function acceptAiTag(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: tx } = await supabase.from("transactions").select().eq("id", id).single();
  if (!tx?.ai_category) return { error: "No suggestion to accept." };

  // Adopt the suggested category: look it up by name and apply it.
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("name", tx.ai_category)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("transactions")
    .update({
      ai_category_review_status: "accepted",
      ...(cat?.id ? { category_id: cat.id } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[acceptAiTag]", error);
    return { error: "Could not update — please try again." };
  }

  await logAudit(supabase, {
    action: "ai_tag.accepted",
    entityType: "transaction",
    entityId: id,
    payload: { category: tx.ai_category },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data };
}

export async function rejectAiTag(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data, error } = await supabase
    .from("transactions")
    .update({ ai_category_review_status: "rejected" })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[rejectAiTag]", error);
    return { error: "Could not update — please try again." };
  }

  await logAudit(supabase, {
    action: "ai_tag.rejected",
    entityType: "transaction",
    entityId: id,
    payload: {},
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = parseTransactionForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to edit a transaction." };

  const { data: before } = await supabase.from("transactions").select().eq("id", id).single();

  const { data, error } = await supabase
    .from("transactions")
    .update(parsed.value)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[updateTransaction]", error);
    return { error: "Could not save — please try again." };
  }

  await logAudit(supabase, {
    action: "transaction.updated",
    entityType: "transaction",
    entityId: data.id,
    payload: { before, after: data },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return { data };
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to delete a transaction." };

  const { data: before } = await supabase.from("transactions").select().eq("id", id).single();

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    console.error("[deleteTransaction]", error);
    return { error: "Could not delete — please try again." };
  }

  await logAudit(supabase, {
    action: "transaction.deleted",
    entityType: "transaction",
    entityId: id,
    payload: { before },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  return {};
}
