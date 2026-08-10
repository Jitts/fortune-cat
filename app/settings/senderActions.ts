"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export type SenderRuleResult = { ok: true } | { error: string };

/**
 * Record a decision about whether scans may open a sender's mail.
 *
 * Both directions go through here because they are the same act — a yes and a
 * no are equally a decision, and both must replace whatever was there before.
 * `opened = false` is what "block this sender" now means: a sender you never
 * open is a blocked sender, so the two concepts merged.
 *
 * `source` is always 'user' from this path. Only the first-scan bank
 * recognition writes 'auto', and the UI leans on that distinction to avoid
 * claiming someone chose something they didn't.
 */
async function setSenderRule(pattern: string, opened: boolean): Promise<SenderRuleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const clean = typeof pattern === "string" ? pattern.toLowerCase().trim() : "";
  if (clean.length < 3 || clean.length > 200) return { error: "That sender doesn't look right." };

  const { error } = await supabase
    .from("sender_rules")
    .upsert(
      { user_id: user.id, pattern: clean, opened, source: "user" },
      { onConflict: "user_id,pattern" },
    );
  if (error) return { error: "Could not save that — please try again." };

  await logAudit(supabase, {
    action: opened ? "sender_rule.opened" : "sender_rule.closed",
    entityType: "sender_rule",
    payload: { pattern: clean },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  revalidatePath("/review");
  return { ok: true };
}

/** Allow future scans to open this sender's mail. */
export async function openSenderRule(pattern: string): Promise<SenderRuleResult> {
  return setSenderRule(pattern, true);
}

/** Never open this sender's mail. Replaces what "block sender" used to mean. */
export async function closeSenderRule(pattern: string): Promise<SenderRuleResult> {
  return setSenderRule(pattern, false);
}
