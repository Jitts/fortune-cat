"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { testImapConnection, fetchRecentEmails } from "@/lib/email/imapClient";
import { parseEmailForTransaction } from "@/lib/email/parseCandidate";
import type { EmailConnection, EmailTransactionCandidate, Transaction } from "@/lib/types";

type ConnectResult = { data: EmailConnection; error?: undefined } | { data?: undefined; error: string };

export async function connectEmailAccount(formData: FormData): Promise<ConnectResult> {
  const email = formData.get("email");
  const host = formData.get("imap_host");
  const portRaw = formData.get("imap_port");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (typeof host !== "string" || !host.trim()) {
    return { error: "Enter the IMAP host for your provider." };
  }
  const port = Number(portRaw);
  if (!port || port < 1 || port > 65535) {
    return { error: "Enter a valid port (usually 993)." };
  }
  if (typeof password !== "string" || !password.trim()) {
    return { error: "Enter your app password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const test = await testImapConnection({ host: host.trim(), port, email, password });
  if (!test.ok) {
    return { error: `Could not connect: ${test.error}` };
  }

  const { data, error } = await supabase
    .from("email_connections")
    .upsert(
      {
        user_id: user.id,
        email,
        imap_host: host.trim(),
        imap_port: port,
        encrypted_password: encryptSecret(password),
        last_scanned_at: null,
      },
      { onConflict: "user_id" },
    )
    .select("id, email, imap_host, imap_port, last_scanned_at, created_at")
    .single();

  if (error || !data) {
    console.error("[connectEmailAccount]", error);
    return { error: "Could not save your connection — please try again." };
  }

  await logAudit(supabase, {
    action: "email_connection.connected",
    entityType: "email_connection",
    entityId: data.id,
    payload: { email },
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  return { data };
}

export async function disconnectEmailAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: existing } = await supabase
    .from("email_connections")
    .select("id, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("email_connections").delete().eq("user_id", user.id);
  if (error) {
    console.error("[disconnectEmailAccount]", error);
    return { error: "Could not disconnect — please try again." };
  }

  if (existing) {
    await logAudit(supabase, {
      action: "email_connection.disconnected",
      entityType: "email_connection",
      entityId: existing.id,
      payload: { email: existing.email },
      riskLevel: "medium",
      userId: user.id,
    });
  }

  revalidatePath("/settings");
  return {};
}

export async function scanEmailInbox(): Promise<{ found: number; scanned: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: connection } = await supabase
    .from("email_connections")
    .select("id, email, imap_host, imap_port, encrypted_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) return { error: "Connect your email first." };

  let emails;
  try {
    emails = await fetchRecentEmails(
      {
        host: connection.imap_host,
        port: connection.imap_port,
        email: connection.email,
        password: decryptSecret(connection.encrypted_password),
      },
      50,
    );
  } catch (err) {
    console.error("[scanEmailInbox]", err);
    return { error: "Could not read your inbox — please reconnect your email." };
  }

  const candidateRows = emails
    .map((mail) => {
      const parsed = parseEmailForTransaction(mail.subject, mail.text);
      if (!parsed) return null;
      return {
        user_id: user.id,
        message_id: mail.messageId,
        email_date: mail.date.toISOString(),
        from_address: mail.from,
        subject: mail.subject,
        amount: parsed.amount,
        suggested_type: parsed.type,
        suggested_category: parsed.category,
        suggested_note: parsed.note,
        raw_snippet: mail.text.trim().slice(0, 200),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  let found = 0;
  if (candidateRows.length > 0) {
    const { data: inserted, error } = await supabase
      .from("email_transaction_candidates")
      .upsert(candidateRows, { onConflict: "user_id,message_id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      console.error("[scanEmailInbox] insert candidates", error);
      return { error: "Scan found matches but could not save them — please try again." };
    }
    found = inserted?.length ?? 0;
  }

  await supabase
    .from("email_connections")
    .update({ last_scanned_at: new Date().toISOString() })
    .eq("user_id", user.id);

  await logAudit(supabase, {
    action: "email_scan.completed",
    entityType: "email_connection",
    entityId: connection.id,
    payload: { emails_scanned: emails.length, candidates_found: found },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/settings");
  return { found, scanned: emails.length };
}

type CandidateActionResult =
  | { data: Transaction | EmailTransactionCandidate; error?: undefined }
  | { data?: undefined; error: string };

export async function acceptEmailCandidate(id: string): Promise<CandidateActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: candidate } = await supabase
    .from("email_transaction_candidates")
    .select()
    .eq("id", id)
    .single();
  if (!candidate) return { error: "Could not find that item." };

  let categoryId: string | null = null;
  if (candidate.suggested_category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("name", candidate.suggested_category)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();
    categoryId = cat?.id ?? null;
  }

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      type: candidate.suggested_type ?? "expense",
      amount: candidate.amount ?? 0,
      category_id: categoryId,
      date: (candidate.email_date ?? new Date().toISOString()).slice(0, 10),
      note: candidate.suggested_note,
      ai_category: candidate.suggested_category,
      ai_category_source: "email_import",
      ai_category_review_status: "accepted",
    })
    .select()
    .single();

  if (txError || !transaction) {
    console.error("[acceptEmailCandidate]", txError);
    return { error: "Could not save the transaction — please try again." };
  }

  const { data: updatedCandidate } = await supabase
    .from("email_transaction_candidates")
    .update({ status: "accepted" })
    .eq("id", id)
    .select()
    .single();

  await logAudit(supabase, {
    action: "transaction.created",
    entityType: "transaction",
    entityId: transaction.id,
    payload: { after: transaction, source: "email_import" },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  revalidatePath("/settings");
  return { data: updatedCandidate ?? transaction };
}

export async function dismissEmailCandidate(id: string): Promise<CandidateActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data, error } = await supabase
    .from("email_transaction_candidates")
    .update({ status: "dismissed" })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[dismissEmailCandidate]", error);
    return { error: "Could not update — please try again." };
  }

  await logAudit(supabase, {
    action: "email_candidate.dismissed",
    entityType: "email_transaction_candidate",
    entityId: id,
    payload: {},
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/settings");
  return { data };
}
