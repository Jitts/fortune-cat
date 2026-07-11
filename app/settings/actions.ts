"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { testImapConnection, fetchRecentEmails, fetchOlderEmails } from "@/lib/email/imapClient";
import { processFetchedEmails, createTransactionFromCandidate } from "@/lib/email/processScan";
import type { EmailConnection, EmailTransactionCandidate, Transaction, TrustedSender } from "@/lib/types";

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
        oldest_scanned_seq: null,
      },
      { onConflict: "user_id" },
    )
    .select("id, email, imap_host, imap_port, last_scanned_at, created_at, oldest_scanned_seq")
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

type ScanResult =
  | { found: number; autoPosted: number; scanned: number; reachedStart: boolean }
  | { error: string };

async function loadTrustedPatterns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase.from("trusted_senders").select("pattern").eq("user_id", userId);
  return (data ?? []).map((row) => row.pattern);
}

export async function scanEmailInbox(): Promise<ScanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: connection } = await supabase
    .from("email_connections")
    .select("id, email, imap_host, imap_port, encrypted_password, oldest_scanned_seq")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) return { error: "Connect your email first." };

  let batch;
  try {
    batch = await fetchRecentEmails(
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

  const outcome = await processFetchedEmails(
    supabase,
    user.id,
    batch.emails,
    await loadTrustedPatterns(supabase, user.id),
  );
  if ("error" in outcome) return outcome;

  // The cursor only ever moves further back — a recent-window rescan must
  // not erase "scan older" progress.
  const oldestSeq =
    connection.oldest_scanned_seq != null && batch.oldestSeq != null
      ? Math.min(connection.oldest_scanned_seq, batch.oldestSeq)
      : (batch.oldestSeq ?? connection.oldest_scanned_seq);

  await supabase
    .from("email_connections")
    .update({ last_scanned_at: new Date().toISOString(), oldest_scanned_seq: oldestSeq })
    .eq("user_id", user.id);

  await logAudit(supabase, {
    action: "email_scan.completed",
    entityType: "email_connection",
    entityId: connection.id,
    payload: {
      emails_scanned: batch.emails.length,
      candidates_found: outcome.found,
      auto_posted: outcome.autoPosted,
    },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/settings");
  revalidatePath("/app");
  return {
    found: outcome.found,
    autoPosted: outcome.autoPosted,
    scanned: batch.emails.length,
    reachedStart: batch.reachedStart,
  };
}

/**
 * Continues scanning further back in the mailbox from wherever the last
 * scan (recent or older) left off — the initial "Scan inbox" only looks at
 * the most recent 50 messages, so older transactions (a months-old hotel
 * receipt, an old subscription invoice) are otherwise never seen.
 */
export async function scanOlderEmails(): Promise<ScanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: connection } = await supabase
    .from("email_connections")
    .select("id, email, imap_host, imap_port, encrypted_password, oldest_scanned_seq")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection) return { error: "Connect your email first." };
  if (connection.oldest_scanned_seq == null) {
    return { error: "Run \"Scan inbox\" first before scanning further back." };
  }
  if (connection.oldest_scanned_seq <= 1) {
    return { found: 0, autoPosted: 0, scanned: 0, reachedStart: true };
  }

  let batch;
  try {
    batch = await fetchOlderEmails(
      {
        host: connection.imap_host,
        port: connection.imap_port,
        email: connection.email,
        password: decryptSecret(connection.encrypted_password),
      },
      connection.oldest_scanned_seq,
      50,
    );
  } catch (err) {
    console.error("[scanOlderEmails]", err);
    return { error: "Could not read your inbox — please reconnect your email." };
  }

  const outcome = await processFetchedEmails(
    supabase,
    user.id,
    batch.emails,
    await loadTrustedPatterns(supabase, user.id),
  );
  if ("error" in outcome) return outcome;

  await supabase
    .from("email_connections")
    .update({ oldest_scanned_seq: batch.oldestSeq })
    .eq("user_id", user.id);

  await logAudit(supabase, {
    action: "email_scan.completed",
    entityType: "email_connection",
    entityId: connection.id,
    payload: {
      emails_scanned: batch.emails.length,
      candidates_found: outcome.found,
      auto_posted: outcome.autoPosted,
      older: true,
    },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/settings");
  revalidatePath("/app");
  return {
    found: outcome.found,
    autoPosted: outcome.autoPosted,
    scanned: batch.emails.length,
    reachedStart: batch.reachedStart,
  };
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

  const result = await createTransactionFromCandidate(supabase, user.id, candidate, "email_review");
  if ("error" in result) {
    return { error: "Could not save the transaction — please try again." };
  }

  const { data: updatedCandidate } = await supabase
    .from("email_transaction_candidates")
    .update({ status: "accepted", transaction_id: result.id })
    .eq("id", id)
    .select()
    .single();

  await logAudit(supabase, {
    action: "transaction.created",
    entityType: "transaction",
    entityId: result.id,
    payload: { source: "email_import", candidate_id: id },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  revalidatePath("/settings");
  return { data: updatedCandidate ?? candidate };
}

/**
 * One-tap undo for an auto-posted transaction: removes it from the ledger and
 * puts the candidate back in review so the user can edit or dismiss instead.
 * Priya's rule — the machine never gets the last word.
 */
export async function undoAutoPost(id: string): Promise<CandidateActionResult> {
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
  if (!candidate || !candidate.auto_posted) return { error: "Could not find that item." };

  if (candidate.transaction_id) {
    const { error: delError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", candidate.transaction_id);
    if (delError) {
      console.error("[undoAutoPost]", delError);
      return { error: "Could not undo — please try again." };
    }
  }

  const { data: updated, error } = await supabase
    .from("email_transaction_candidates")
    .update({
      status: "pending",
      auto_posted: false,
      transaction_id: null,
      review_reason: "auto-post undone — review manually",
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    console.error("[undoAutoPost]", error);
    return { error: "Could not undo — please try again." };
  }

  await logAudit(supabase, {
    action: "email_candidate.auto_post_undone",
    entityType: "email_transaction_candidate",
    entityId: id,
    payload: { transaction_id: candidate.transaction_id },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  revalidatePath("/settings");
  return { data: updated };
}

type TrustResult = { data: TrustedSender; error?: undefined } | { data?: undefined; error: string };

/**
 * Adds a sender's domain to the trusted list — from now on, SGD transactions
 * parsed from matching senders auto-post instead of waiting in review.
 */
export async function trustSender(fromAddress: string): Promise<TrustResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const emailMatch = fromAddress.toLowerCase().match(/@([a-z0-9.-]+)/);
  const pattern = (emailMatch?.[1] ?? fromAddress.toLowerCase()).trim();
  if (!pattern || pattern.length < 3) return { error: "Could not read a sender domain." };

  const { data, error } = await supabase
    .from("trusted_senders")
    .upsert({ user_id: user.id, pattern }, { onConflict: "user_id,pattern" })
    .select()
    .single();

  if (error || !data) {
    console.error("[trustSender]", error);
    return { error: "Could not save — please try again." };
  }

  await logAudit(supabase, {
    action: "trusted_sender.added",
    entityType: "trusted_sender",
    entityId: data.id,
    payload: { pattern },
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  return { data };
}

export async function untrustSender(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { error } = await supabase.from("trusted_senders").delete().eq("id", id);
  if (error) {
    console.error("[untrustSender]", error);
    return { error: "Could not remove — please try again." };
  }

  await logAudit(supabase, {
    action: "trusted_sender.removed",
    entityType: "trusted_sender",
    entityId: id,
    payload: {},
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  return {};
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
