import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { processFetchedEmails } from "@/lib/email/processScan";
import { parseSmsTransaction, suggestSmsAccountTag } from "@/lib/sms/parseSms";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/inbound/sms — receives a bank SMS forwarded by the user's phone
 * shortcut. Body: { token, from?, body, receivedAt? }.
 *
 * The per-user token (from the Capture screen) is the only credential; it
 * maps to exactly one user, is regenerable, and a wrong token gets a plain
 * 401 with no detail. Non-transaction SMS (OTPs, promos) are acknowledged
 * and dropped — the shortcut can forward everything without leaking noise
 * into the ledger.
 */
export async function POST(request: Request) {
  let payload: { token?: unknown; from?: unknown; body?: unknown; receivedAt?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const from = typeof payload.from === "string" && payload.from.trim() ? payload.from.trim().slice(0, 40) : "unknown";

  if (!token || token.length < 16 || token.length > 128) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: "Body too long" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("sms_tokens")
    .select("id, user_id")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("sms_tokens")
    .update({ last_received_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  // Same SMS forwarded twice (shortcut retries) hashes to the same id and
  // dedups; bank SMS bodies include date/time so repeat purchases differ.
  const messageId = `sms-${createHash("sha1").update(`${from}|${body}`).digest("hex").slice(0, 24)}`;

  const receivedAt =
    typeof payload.receivedAt === "string" && !Number.isNaN(Date.parse(payload.receivedAt))
      ? new Date(payload.receivedAt)
      : new Date();

  const { data: trusted } = await supabase
    .from("trusted_senders")
    .select("pattern")
    .eq("user_id", tokenRow.user_id);

  const outcome = await processFetchedEmails(
    supabase,
    tokenRow.user_id,
    [
      {
        messageId,
        date: receivedAt,
        from: `sms:${from}`,
        subject: body.slice(0, 120),
        text: body,
      },
    ],
    (trusted ?? []).map((t) => t.pattern),
    {
      parser: (_subject, text) => parseSmsTransaction(text),
      accountTagger: (fromAddr, text) => suggestSmsAccountTag(fromAddr, text),
      source: "sms",
    },
  );

  if ("error" in outcome) {
    console.error("[inbound/sms]", outcome.error);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  if (outcome.found > 0) {
    await logAudit(supabase, {
      action: "sms_capture.received",
      entityType: "email_transaction_candidate",
      payload: { from, auto_posted: outcome.autoPosted },
      riskLevel: "low",
      userId: tokenRow.user_id,
    });
  }

  return NextResponse.json({
    ok: true,
    captured: outcome.found,
    autoPosted: outcome.autoPosted,
    ignored: outcome.found === 0,
  });
}
