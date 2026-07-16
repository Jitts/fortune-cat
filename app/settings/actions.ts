"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { testImapConnection, fetchRecentEmails, fetchOlderEmails } from "@/lib/email/imapClient";
import { processFetchedEmails, createTransactionFromCandidate } from "@/lib/email/processScan";
import { parseStatementCsv, type StatementRow } from "@/lib/csv/parseStatement";
import { parseStatementText } from "@/lib/docs/parseStatementText";
import { parseEmailForTransaction } from "@/lib/email/parseCandidate";
import { convertToBase } from "@/lib/fx";
import { getBaseCurrency, getUserProfile } from "@/lib/profile";
import { suggestCategory } from "@/lib/tagger";
import { inboxLimit } from "@/lib/email/inboxLimits";
import { ensureGraphAccessToken, fetchRecentMessagesGraph } from "@/lib/email/graphClient";
import type { BlockedSender, EmailConnection, EmailTransactionCandidate, Transaction, TrustedSender } from "@/lib/types";

type ConnectResult = { data: EmailConnection; error?: undefined } | { data?: undefined; error: string };

// Personal Microsoft accounts (Outlook/Hotmail/Live/365) no longer accept
// app-password IMAP — Microsoft requires OAuth now. When a connect attempt to
// one of those hosts fails on authentication, say so plainly instead of
// surfacing the raw "AUTHENTICATE failed" from the IMAP server.
function friendlyConnectError(host: string, rawError: string): string {
  const isMicrosoft = /office365|outlook|hotmail|live\.com/i.test(host);
  const looksLikeAuth = /authenticate|auth|login|credential|password/i.test(rawError);
  if (isMicrosoft && looksLikeAuth) {
    return "Outlook/Hotmail no longer allow app-password IMAP — Microsoft requires sign-in. Use \"Continue with Microsoft\" if it's offered, or connect a Gmail, Yahoo, or iCloud inbox instead.";
  }
  return `Could not connect: ${rawError}`;
}

// Whether the current user has an active plan — gates the inbox cap. Relies on
// RLS to scope the payments read to this user.
async function hasActivePlan(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return !!data;
}

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
    return { error: friendlyConnectError(host.trim(), test.error) };
  }

  // Enforce the per-tier inbox cap. Re-connecting an inbox already on file is a
  // credential update (upsert on (user_id, email)), so it never counts toward
  // the cap; only a genuinely new inbox does.
  const normalized = email.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("email_connections")
    .select("id, email")
    .eq("user_id", user.id);
  const alreadyConnected = (existing ?? []).some((c) => c.email.trim().toLowerCase() === normalized);

  if (!alreadyConnected) {
    const limit = inboxLimit(await hasActivePlan(supabase));
    if ((existing?.length ?? 0) >= limit) {
      return {
        error:
          limit === 1
            ? "Free accounts can auto-scan one inbox. Go Pro to connect up to 3."
            : `You've reached the maximum of ${limit} connected inboxes.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("email_connections")
    .upsert(
      {
        user_id: user.id,
        email: normalized,
        imap_host: host.trim(),
        imap_port: port,
        encrypted_password: encryptSecret(password),
      },
      { onConflict: "user_id,email" },
    )
    .select("id, email, imap_host, imap_port, last_scanned_at, created_at, oldest_scanned_seq, auth_type")
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

export async function disconnectEmailAccount(connectionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  if (typeof connectionId !== "string" || !connectionId) return { error: "Missing inbox reference." };

  // Scope to (user_id, id) so a user can only ever drop their own inbox — the
  // id alone is never trusted. RLS enforces this too; the filter is belt-and-
  // suspenders and lets us surface a clean "not found".
  const { data: existing } = await supabase
    .from("email_connections")
    .select("id, email")
    .eq("user_id", user.id)
    .eq("id", connectionId)
    .maybeSingle();
  if (!existing) return { error: "Could not find that inbox." };

  const { error } = await supabase
    .from("email_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("id", connectionId);
  if (error) {
    console.error("[disconnectEmailAccount]", error);
    return { error: "Could not disconnect — please try again." };
  }

  await logAudit(supabase, {
    action: "email_connection.disconnected",
    entityType: "email_connection",
    entityId: existing.id,
    payload: { email: existing.email },
    riskLevel: "medium",
    userId: user.id,
  });

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

export async function scanEmailInbox(connectionId: string): Promise<ScanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  if (typeof connectionId !== "string" || !connectionId) return { error: "Missing inbox reference." };

  const { data: connection } = await supabase
    .from("email_connections")
    .select(
      "id, email, imap_host, imap_port, encrypted_password, oldest_scanned_seq, auth_type, oauth_access_token, oauth_refresh_token, oauth_token_expires_at",
    )
    .eq("user_id", user.id)
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection) return { error: "Connect your email first." };

  let batch;
  try {
    batch =
      connection.auth_type === "microsoft"
        ? {
            emails: await fetchRecentMessagesGraph(
              await ensureGraphAccessToken(supabase, connection),
              50,
            ),
            oldestSeq: null,
            reachedStart: true,
          }
        : await fetchRecentEmails(
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
    return {
      error:
        connection.auth_type === "microsoft"
          ? "Could not read your Microsoft mailbox — try reconnecting it."
          : "Could not read your inbox — please reconnect your email.",
    };
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
    .eq("id", connection.id);

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
export async function scanOlderEmails(connectionId: string): Promise<ScanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  if (typeof connectionId !== "string" || !connectionId) return { error: "Missing inbox reference." };

  const { data: connection } = await supabase
    .from("email_connections")
    .select("id, email, imap_host, imap_port, encrypted_password, oldest_scanned_seq, auth_type")
    .eq("user_id", user.id)
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection) return { error: "Connect your email first." };
  if (connection.auth_type === "microsoft") {
    return { error: "Older-email scan isn't available for Microsoft inboxes yet." };
  }
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
    .eq("id", connection.id);

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

  const result = await createTransactionFromCandidate(
    supabase,
    user.id,
    candidate,
    candidate.source === "email" ? "email_review" : "csv",
  );
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

type BlockResult =
  | { data: BlockedSender; dismissed: number; error?: undefined }
  | { data?: undefined; error: string };

// Freemail domains never contribute to the anonymous global aggregate — one
// person blocking a personal contact must not nudge a shared domain's score.
const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "msn.com", "yahoo.com", "yahoo.com.sg", "ymail.com", "icloud.com", "me.com",
  "mac.com", "proton.me", "protonmail.com", "pm.me", "aol.com", "gmx.com",
  "zoho.com", "mail.com", "qq.com", "163.com", "126.com", "naver.com",
]);

/**
 * Anonymous (domain, country) block tally — service-role write, no user ids.
 * Best-effort: a signal failure never fails the user's block/unblock.
 */
async function bumpSenderSignal(domain: string, country: string, delta: 1 | -1) {
  if (FREEMAIL_DOMAINS.has(domain) || !domain.includes(".")) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("sender_signals")
      .select("block_count")
      .eq("domain", domain)
      .eq("country", country)
      .maybeSingle();
    // ponytail: read-modify-write race under concurrent blocks; swap for an
    // atomic RPC if signal volume ever matters.
    await admin.from("sender_signals").upsert(
      {
        domain,
        country,
        block_count: Math.max(0, (data?.block_count ?? 0) + delta),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "domain,country" },
    );
  } catch (err) {
    console.error("[bumpSenderSignal]", err);
  }
}

/**
 * The mirror of trustSender: every future scan skips this sender entirely,
 * and its currently-pending review items are dismissed on the spot.
 */
export async function blockSender(fromAddress: string): Promise<BlockResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };
  if (typeof fromAddress !== "string" || !fromAddress.trim()) return { error: "Missing sender." };

  const emailMatch = fromAddress.toLowerCase().match(/@([a-z0-9.-]+)/);
  const pattern = (emailMatch?.[1] ?? fromAddress.toLowerCase()).trim();
  if (!pattern || pattern.length < 3) return { error: "Could not read a sender domain." };

  // First-time block by this user drives the distinct-user aggregate below.
  const { data: existing } = await supabase
    .from("blocked_senders")
    .select("id")
    .eq("user_id", user.id)
    .eq("pattern", pattern)
    .maybeSingle();

  const { data, error } = await supabase
    .from("blocked_senders")
    .upsert({ user_id: user.id, pattern }, { onConflict: "user_id,pattern" })
    .select()
    .single();

  if (error || !data) {
    console.error("[blockSender]", error);
    return { error: "Could not save — please try again." };
  }

  // Sweep the sender's pending review items — same substring match the scans
  // use, applied in JS so the semantics can never drift from processScan.
  const { data: pendingRows } = await supabase
    .from("email_transaction_candidates")
    .select("id, from_address")
    .eq("user_id", user.id)
    .eq("status", "pending");
  const ids = (pendingRows ?? [])
    .filter((c) => (c.from_address ?? "").toLowerCase().includes(pattern))
    .map((c) => c.id);
  if (ids.length > 0) {
    await supabase
      .from("email_transaction_candidates")
      .update({ status: "dismissed" })
      .in("id", ids)
      .eq("user_id", user.id);
  }

  if (!existing) {
    const profile = await getUserProfile(supabase);
    await bumpSenderSignal(pattern, profile.country ?? "", 1);
  }

  await logAudit(supabase, {
    action: "blocked_sender.added",
    entityType: "blocked_sender",
    entityId: data.id,
    payload: { pattern, dismissed: ids.length },
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  revalidatePath("/app");
  return { data, dismissed: ids.length };
}

export async function unblockSender(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: existing } = await supabase
    .from("blocked_senders")
    .select("id, pattern")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Could not find that blocked sender." };

  const { error } = await supabase
    .from("blocked_senders")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) {
    console.error("[unblockSender]", error);
    return { error: "Could not remove — please try again." };
  }

  const profile = await getUserProfile(supabase);
  await bumpSenderSignal(existing.pattern, profile.country ?? "", -1);

  await logAudit(supabase, {
    action: "blocked_sender.removed",
    entityType: "blocked_sender",
    entityId: id,
    payload: { pattern: existing.pattern },
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  revalidatePath("/app");
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

type ImportResult =
  | { found: number; flagged: number; skipped: number; parsed: number }
  | { error: string };

/**
 * The shared tail of every document import (CSV, PDF, screenshot): parsed
 * rows become review candidates (documents never auto-post — the whole point
 * of a backfill is that you look before it lands). Dedup twice: content-hash
 * ids make re-uploads idempotent, and rows whose amount+type match an
 * existing ledger transaction within ±3 days get flagged as possible
 * duplicates so "Accept all" skips them.
 */
async function importParsedRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rows: StatementRow[],
  meta: { fileLabel: string; accountTag: string | null; source: "csv" | "pdf" | "image"; skipped: number },
): Promise<ImportResult> {
  // One query for everything already in the ledger around the statement's
  // date range — the duplicate check then runs in memory.
  const dates = rows.map((r) => r.date).sort();
  const pad = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const { data: existing } = await supabase
    .from("transactions")
    .select("amount, type, date")
    .gte("date", pad(dates[0], -3))
    .lte("date", pad(dates[dates.length - 1], 3));

  const seen = new Map<string, number>();
  const candidateRows = rows.map((row) => {
    const base = `${row.date}|${row.description}|${row.amount}|${row.type}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const messageId = `doc-${createHash("sha1").update(base).digest("hex").slice(0, 24)}-${n}`;

    const duplicate = (existing ?? []).find((t) => {
      if (t.type !== row.type || Number(t.amount) !== row.amount) return false;
      const diff = Math.abs(new Date(`${t.date}T00:00:00Z`).getTime() - new Date(`${row.date}T00:00:00Z`).getTime());
      return diff <= 3 * 24 * 60 * 60 * 1000;
    });

    const suggestion = suggestCategory(row.description, row.type);

    return {
      user_id: userId,
      message_id: messageId,
      email_date: `${row.date}T00:00:00Z`,
      from_address: meta.fileLabel,
      subject: row.description,
      amount: row.amount,
      suggested_type: row.type,
      suggested_category: suggestion?.category ?? null,
      suggested_note: row.description,
      raw_snippet: row.description,
      account_tag: meta.accountTag,
      review_reason: duplicate
        ? `possible duplicate — same amount already in your ledger on ${duplicate.date}`
        : null,
      auto_posted: false,
      status: "pending",
      source: meta.source,
    };
  });

  const { data: inserted, error } = await supabase
    .from("email_transaction_candidates")
    .upsert(candidateRows, { onConflict: "user_id,message_id", ignoreDuplicates: true })
    .select("id, review_reason");

  if (error) {
    console.error("[importParsedRows]", error);
    return { error: "Could not save the imported rows — please try again." };
  }

  // Only count flags among rows that were actually new this upload.
  const flagged = (inserted ?? []).filter((r) => r.review_reason != null).length;

  await logAudit(supabase, {
    action: "document_import.completed",
    entityType: "email_transaction_candidate",
    payload: {
      filename: meta.fileLabel,
      source: meta.source,
      parsed: rows.length,
      inserted: inserted?.length ?? 0,
      flagged,
      skipped: meta.skipped,
    },
    riskLevel: "low",
    userId: userId,
  });

  revalidatePath("/settings");
  revalidatePath("/review");
  revalidatePath("/app");
  return { found: inserted?.length ?? 0, flagged, skipped: meta.skipped, parsed: rows.length };
}

function readMeta(formData: FormData, fallbackName: string) {
  const filename = formData.get("filename");
  const accountTagRaw = formData.get("account_tag");
  return {
    fileLabel:
      typeof filename === "string" && filename.trim() ? filename.trim().slice(0, 80) : fallbackName,
    accountTag:
      typeof accountTagRaw === "string" && accountTagRaw.trim() ? accountTagRaw.trim().slice(0, 24) : null,
  };
}

export async function importStatementCsv(formData: FormData): Promise<ImportResult> {
  const csvText = formData.get("csv");
  if (typeof csvText !== "string" || !csvText.trim()) {
    return { error: "The file looks empty — export a CSV from your bank and try again." };
  }
  if (csvText.length > 1_000_000) {
    return { error: "That file is over 1MB — export a shorter statement period." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const parsed = parseStatementCsv(csvText);
  if ("error" in parsed) return parsed;
  if (parsed.rows.length === 0) {
    return { error: "No transactions found in that file — check it's a bank statement export." };
  }

  const meta = readMeta(formData, "statement.csv");
  return importParsedRows(supabase, user.id, parsed.rows.slice(0, 500), {
    ...meta,
    source: "csv",
    skipped: parsed.skipped,
  });
}

/**
 * Turns statement TEXT — extracted from a PDF server-side, or OCR'd from a
 * screenshot in the browser — into review candidates. Multi-line statements
 * go through the line heuristic; when that finds nothing (a single-receipt
 * PDF or a photo of one receipt), the email receipt parser takes over and
 * produces one candidate.
 */
export async function importDocument(formData: FormData): Promise<ImportResult> {
  const kind = formData.get("kind");
  let text: string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  // Both kinds arrive as already-extracted text: PDFs are read by pdfjs in
  // the browser and screenshots are OCR'd there — the file itself never
  // reaches the server.
  {
    const raw = formData.get("text");
    if (typeof raw !== "string" || !raw.trim()) {
      return {
        error:
          kind === "pdf"
            ? "Couldn't read any text from that PDF — if it's a scanned image, upload it as a screenshot instead."
            : "Couldn't read any text from that image — try a sharper, closer screenshot.",
      };
    }
    text = raw;
  }
  if (text.length > 2_000_000) {
    return { error: "That document is too large — split it into shorter statement periods." };
  }

  const source = kind === "pdf" ? ("pdf" as const) : ("image" as const);
  const meta = readMeta(formData, source === "pdf" ? "statement.pdf" : "screenshot");

  const statement = parseStatementText(text);
  if (statement.rows.length >= 2) {
    return importParsedRows(supabase, user.id, statement.rows.slice(0, 500), {
      ...meta,
      source,
      skipped: statement.skipped,
    });
  }

  // Single-receipt fallback — same rule-based heuristic the email scanner
  // uses, so a PDF invoice or a photo of one receipt still becomes a capture.
  const receipt = parseEmailForTransaction(meta.fileLabel, text);
  const single = statement.rows[0] ??
    (receipt
      ? {
          date: new Date().toISOString().slice(0, 10),
          description: receipt.note,
          amount: receipt.amount,
          type: receipt.type,
        }
      : null);

  if (!single) {
    return {
      error:
        "Couldn't find any transactions in that document — no dated statement lines and no receipt-style total.",
    };
  }

  // Receipts parsed via the email heuristic may be in a foreign currency —
  // foreign meaning "not the user's own base currency".
  const baseCurrency = await getBaseCurrency(supabase, user.id);
  if (receipt && !statement.rows[0] && receipt.currency !== baseCurrency) {
    const fx = await convertToBase(receipt.amount, receipt.currency, baseCurrency);
    if (fx) single.amount = fx.base;
    const rows = await importParsedRows(supabase, user.id, [single], { ...meta, source, skipped: 0 });
    if ("error" in rows) return rows;
    // Mark the FX guess for review visibility (importParsedRows only flags duplicates).
    await supabase
      .from("email_transaction_candidates")
      .update({
        original_amount: receipt.amount,
        original_currency: receipt.currency,
        review_reason: fx
          ? `${receipt.currency} ${receipt.amount.toLocaleString("en-SG")} @ ${fx.rate.toFixed(4)} — confirm the rate`
          : `${receipt.currency} ${receipt.amount.toLocaleString("en-SG")} — rate unavailable, edit the ${baseCurrency} amount`,
      })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("amount", single.amount)
      .eq("from_address", meta.fileLabel);
    return rows;
  }

  return importParsedRows(supabase, user.id, [single], { ...meta, source, skipped: 0 });
}

/**
 * Bulk-accepts every CLEAN pending capture (no review reason). Flagged rows —
 * possible duplicates, foreign currency, unknown senders — stay behind for
 * individual judgement; bulk never overrides a raised hand.
 */
export async function acceptAllCleanCandidates(): Promise<{ accepted: number; failed: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { data: candidates } = await supabase
    .from("email_transaction_candidates")
    .select()
    .eq("user_id", user.id)
    .eq("status", "pending")
    .is("review_reason", null)
    .limit(200);

  if (!candidates || candidates.length === 0) return { accepted: 0, failed: 0 };

  let accepted = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const result = await createTransactionFromCandidate(
      supabase,
      user.id,
      candidate,
      candidate.source === "email"
        ? "email_review"
        : candidate.source === "sms"
          ? "sms"
          : "csv",
    );
    if ("error" in result) {
      failed++;
      continue;
    }
    await supabase
      .from("email_transaction_candidates")
      .update({ status: "accepted", transaction_id: result.id })
      .eq("id", candidate.id);
    accepted++;
  }

  await logAudit(supabase, {
    action: "email_candidates.bulk_accepted",
    entityType: "email_transaction_candidate",
    payload: { accepted, failed },
    riskLevel: "low",
    userId: user.id,
  });

  revalidatePath("/app");
  revalidatePath("/review");
  revalidatePath("/settings");
  return { accepted, failed };
}

type SmsTokenResult =
  | { data: { token: string; created_at: string; last_received_at: string | null }; error?: undefined }
  | { data?: undefined; error: string };

/**
 * Turns SMS forwarding on (or rotates the token — calling it again mints a
 * fresh token, instantly invalidating the old one). The token is the only
 * credential the phone shortcut holds.
 */
export async function enableSmsForwarding(): Promise<SmsTokenResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const token = createHash("sha1")
    .update(`${user.id}-${Date.now()}-${Math.random()}`)
    .digest("hex");

  const { data, error } = await supabase
    .from("sms_tokens")
    .upsert({ user_id: user.id, token }, { onConflict: "user_id" })
    .select("token, created_at, last_received_at")
    .single();

  if (error || !data) {
    console.error("[enableSmsForwarding]", error);
    return { error: "Could not enable SMS forwarding — please try again." };
  }

  await logAudit(supabase, {
    action: "sms_forwarding.enabled",
    entityType: "sms_token",
    payload: {},
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  return { data };
}

export async function disableSmsForwarding(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in." };

  const { error } = await supabase.from("sms_tokens").delete().eq("user_id", user.id);
  if (error) {
    console.error("[disableSmsForwarding]", error);
    return { error: "Could not disable — please try again." };
  }

  await logAudit(supabase, {
    action: "sms_forwarding.disabled",
    entityType: "sms_token",
    payload: {},
    riskLevel: "medium",
    userId: user.id,
  });

  revalidatePath("/settings");
  return {};
}
