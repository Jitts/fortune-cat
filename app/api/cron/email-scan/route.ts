import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { fetchRecentEmails } from "@/lib/email/imapClient";
import { ensureGraphAccessToken, fetchRecentMessagesGraph } from "@/lib/email/graphClient";
import { processFetchedEmails } from "@/lib/email/processScan";
import { logAudit } from "@/lib/audit";

// IMAP fetch + parse for every connected inbox — needs more than the default
// serverless budget. 60s is the Hobby-plan ceiling.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/email-scan — the scheduled background scan (vercel.json cron).
 * Vercel invokes it with `Authorization: Bearer ${CRON_SECRET}`; anything
 * without that exact header is rejected, so the endpoint can't be used to
 * trigger scans (or burn our IMAP quota) by strangers.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: connections, error } = await supabase.from("email_connections").select();
  if (error) {
    console.error("[cron/email-scan] list connections", error);
    return NextResponse.json({ error: "Could not list connections" }, { status: 500 });
  }

  const results: Array<Record<string, unknown>> = [];
  for (const conn of connections ?? []) {
    try {
      const batch =
        conn.auth_type === "microsoft"
          ? {
              emails: await fetchRecentMessagesGraph(
                await ensureGraphAccessToken(supabase, conn),
                50,
              ),
              oldestSeq: null as number | null,
              reachedStart: true,
            }
          : await fetchRecentEmails(
              {
                host: conn.imap_host,
                port: conn.imap_port,
                email: conn.email,
                password: decryptSecret(conn.encrypted_password),
              },
              50,
            );

      const { data: trusted } = await supabase
        .from("trusted_senders")
        .select("pattern")
        .eq("user_id", conn.user_id);

      const outcome = await processFetchedEmails(
        supabase,
        conn.user_id,
        batch.emails,
        (trusted ?? []).map((t) => t.pattern),
      );
      if ("error" in outcome) throw new Error(outcome.error);

      // Never let a recent-window scan erase "scan older" progress: the
      // cursor only ever moves further back, not forward.
      const oldestSeq =
        conn.oldest_scanned_seq != null && batch.oldestSeq != null
          ? Math.min(conn.oldest_scanned_seq, batch.oldestSeq)
          : (batch.oldestSeq ?? conn.oldest_scanned_seq);

      await supabase
        .from("email_connections")
        .update({ last_scanned_at: new Date().toISOString(), oldest_scanned_seq: oldestSeq })
        .eq("id", conn.id);

      await logAudit(supabase, {
        action: "email_scan.cron_completed",
        entityType: "email_connection",
        entityId: conn.id,
        payload: {
          emails_scanned: batch.emails.length,
          candidates_found: outcome.found,
          auto_posted: outcome.autoPosted,
        },
        riskLevel: "low",
        userId: conn.user_id,
      });

      results.push({ connection: conn.id, scanned: batch.emails.length, ...outcome });
    } catch (err) {
      console.error(`[cron/email-scan] connection ${conn.id}`, err);
      results.push({ connection: conn.id, error: err instanceof Error ? err.message : "failed" });
    }
  }

  return NextResponse.json({ ok: true, connections: results.length, results });
}
