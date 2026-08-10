"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { forwardingAddressFor } from "@/lib/email/forwardingAddress";
import { logAudit } from "@/lib/audit";

export type ForwardingResult =
  | { address: string; error?: undefined }
  | { address?: undefined; error: string };

// Lowercase alphanumeric only, minus the characters people misread aloud or
// mistype from a screenshot. The token is shown on screen and retyped into a
// mail client by hand, so "was that a 1 or an l" is a real failure mode, and
// mail systems may case-fold the local part regardless of what we generate.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function mintToken(length = 24): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/**
 * Create the forwarding address, or return the existing one.
 *
 * Idempotent on purpose: the Capture screen calls this to reveal the address,
 * and someone clicking twice must not silently invalidate the address they
 * already set up a Gmail rule against.
 */
export async function enableForwarding(): Promise<ForwardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: existing } = await supabase
    .from("email_forwarding_tokens")
    .select("token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.token) {
    const address = forwardingAddressFor(existing.token);
    return address ? { address } : { error: "Forwarding isn't configured yet." };
  }

  const token = mintToken();
  const { error } = await supabase
    .from("email_forwarding_tokens")
    .insert({ user_id: user.id, token });
  if (error) {
    console.error("[enableForwarding]", error);
    return { error: "Could not set that up — please try again." };
  }

  const address = forwardingAddressFor(token);
  if (!address) return { error: "Forwarding isn't configured yet." };

  await logAudit(supabase, {
    action: "email_forwarding.enabled",
    entityType: "email_forwarding_token",
    payload: {},
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/settings");
  return { address };
}

/**
 * Mint a new address and retire the old one.
 *
 * The reason this exists: the address appears in the To: header of every
 * message forwarded to it, so it reaches anyone else on those threads. If
 * someone starts receiving junk through it, rotating is the fix, and it should
 * not require asking anybody. Any Gmail forwarding rule pointing at the old
 * address stops working — the copy says so before the click, since silently
 * breaking someone's setup is worse than making them confirm.
 */
export async function rotateForwardingAddress(): Promise<ForwardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const token = mintToken();
  const { data, error } = await supabase
    .from("email_forwarding_tokens")
    .update({
      token,
      // The old address's confirmation code is meaningless now, and leaving it
      // on screen would send someone to paste a code that can never verify.
      pending_confirmation_code: null,
      pending_confirmation_url: null,
      pending_confirmation_at: null,
    })
    .eq("user_id", user.id)
    .select("token")
    .maybeSingle();

  if (error || !data) {
    console.error("[rotateForwardingAddress]", error);
    return { error: "Could not change the address — please try again." };
  }

  const address = forwardingAddressFor(data.token);
  if (!address) return { error: "Forwarding isn't configured yet." };

  await logAudit(supabase, {
    action: "email_forwarding.rotated",
    entityType: "email_forwarding_token",
    payload: {},
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  return { address };
}

/** Turn the channel off entirely — deleting the row stops all routing. */
export async function disableForwarding(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { error } = await supabase
    .from("email_forwarding_tokens")
    .delete()
    .eq("user_id", user.id);
  if (error) {
    console.error("[disableForwarding]", error);
    return { error: "Could not turn it off — please try again." };
  }

  await logAudit(supabase, {
    action: "email_forwarding.disabled",
    entityType: "email_forwarding_token",
    payload: {},
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  return {};
}

/** Clear the Gmail code once the person has used it. */
export async function dismissForwardingCode(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  await supabase
    .from("email_forwarding_tokens")
    .update({
      pending_confirmation_code: null,
      pending_confirmation_url: null,
      pending_confirmation_at: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/settings");
  return {};
}
