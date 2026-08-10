import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { htmlToText } from "html-to-text";
import { createAdminClient } from "@/lib/supabase/admin";
import { processFetchedEmails } from "@/lib/email/processScan";
import { parseForwardedMessage } from "@/lib/email/parseForwarded";
import {
  extractGmailConfirmation,
  headerIndex,
  tokenFromRecipient,
} from "@/lib/email/inboundEmail";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/inbound/email — a message forwarded to the user's Fortune Cat
 * address, delivered by CloudMailin as JSON.
 *
 * The second capture channel, and the one that asks for nothing. IMAP wants an
 * app password: a single credential that reaches every folder and can send as
 * you. Forwarding wants a person to press Forward. Only the message they chose
 * ever arrives.
 *
 * Two guards, for two different problems:
 *
 *  - A shared secret in the URL proves the POST came from CloudMailin. Without
 *    it this endpoint would accept writes from anyone who learned a user's
 *    forwarding address, and those addresses are not secret (see below).
 *  - The +tag in the recipient address names the user. It is NOT a credential:
 *    it rides in the To: header of every message forwarded with it, so mail
 *    providers, other recipients on the thread, and anyone quoted into a reply
 *    can read it. Everything arriving here therefore goes to review and never
 *    auto-posts — `explicit: true` in processFetchedEmails is what enforces
 *    that, and it is the reason a leaked address means "junk in my review
 *    queue" rather than "junk in my ledger".
 */

/** Compare without leaking length or position through timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

type CloudMailinPayload = {
  envelope?: { to?: unknown; from?: unknown; recipients?: unknown };
  headers?: { from?: unknown; to?: unknown; subject?: unknown; message_id?: unknown; date?: unknown };
  plain?: unknown;
  html?: unknown;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  const expected = process.env.CLOUDMAILIN_WEBHOOK_SECRET ?? "";
  if (!expected) {
    // Fail closed. An open inbound endpoint is worse than a broken one: the
    // broken one is noticed during setup, the open one is not noticed at all.
    console.error("[inbound/email] CLOUDMAILIN_WEBHOOK_SECRET is not set — refusing traffic");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const provided = new URL(request.url).searchParams.get("key") ?? "";
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CloudMailinPayload;
  try {
    payload = (await request.json()) as CloudMailinPayload;
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  // The envelope recipient is the real RCPT TO. Prefer it over the To: header,
  // which can be missing, rewritten by a forwarding rule, or list someone else
  // entirely when the message was Bcc'd.
  const envelopeTo = str(payload.envelope?.to);
  const recipients = Array.isArray(payload.envelope?.recipients)
    ? (payload.envelope.recipients as unknown[]).map(str)
    : [];
  const candidates = [envelopeTo, ...recipients, str(payload.headers?.to)].filter(Boolean);

  let token = "";
  for (const candidate of candidates) {
    token = tokenFromRecipient(candidate);
    if (token) break;
  }
  // 200, not 4xx: a message we can't route is still a message we've accepted
  // and don't want redelivered. A 4xx makes CloudMailin retry, then bounce to
  // whoever sent it — which would mail a stranger's bank alert back to them
  // with our error attached.
  if (!token || token.length < 16 || token.length > 64) {
    console.warn("[inbound/email] no routable token in recipients");
    return NextResponse.json({ ok: true, routed: false });
  }

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("email_forwarding_tokens")
    .select("id, user_id, received_count")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow) {
    console.warn("[inbound/email] unknown token");
    return NextResponse.json({ ok: true, routed: false });
  }

  const h = headerIndex(payload.headers);
  // Envelope sender as the last resort: better to attribute a capture to the
  // forwarder than to an empty string.
  const rawFrom = h.get("from") || str(payload.envelope?.from);
  const rawSubject = (h.get("subject") ?? "").slice(0, 300);

  // Key names only, never values — headers carry addresses and routing detail.
  // This is the breadcrumb that would have identified the swallowed
  // confirmation email in one look instead of a database dig.
  if (!rawFrom) {
    console.warn("[inbound/email] no From header; keys seen:", [...h.keys()].join(","));
  }
  const plain = str(payload.plain).trim();
  const text = (plain || (str(payload.html) ? htmlToText(str(payload.html), { wordwrap: false }) : ""))
    .slice(0, 100_000);

  // Gmail's setup code, before anything else — it is not a transaction and
  // must not be parsed as one.
  const confirmation = extractGmailConfirmation(rawFrom, rawSubject, text);
  if (confirmation) {
    await supabase
      .from("email_forwarding_tokens")
      .update({
        pending_confirmation_code: confirmation.code,
        pending_confirmation_url: confirmation.url,
        pending_confirmation_at: new Date().toISOString(),
      })
      .eq("id", tokenRow.id);
    await logAudit(supabase, {
      action: "email_forwarding.confirmation_received",
      entityType: "email_forwarding_token",
      entityId: tokenRow.id,
      // Whether each half was readable, never the values. If Google reworks
      // the wording again this is the line that says so immediately.
      payload: { hasCode: !!confirmation.code, hasUrl: !!confirmation.url },
      riskLevel: "low",
      userId: tokenRow.user_id,
    });
    // Return regardless of what was extracted: a setup email holds no
    // transaction, so parsing on would only ever produce noise.
    return NextResponse.json({ ok: true, confirmation: true });
  }

  if (!text) return NextResponse.json({ ok: true, captured: 0 });

  // Recover the bank from inside the quoted body. Without this every forwarded
  // capture is attributed to the person who forwarded it, so the account tag
  // and trusted-sender matching both work off the wrong address.
  const fwd = parseForwardedMessage(text);
  const originalFrom = fwd.unwrapped && fwd.from ? fwd.from : rawFrom;
  const subject = fwd.unwrapped && fwd.subject ? fwd.subject : rawSubject;
  const bodyText = fwd.unwrapped ? fwd.body : text;

  const headerDate = new Date(h.get("date") ?? "");
  const date =
    fwd.date ?? (Number.isNaN(headerDate.getTime()) ? new Date() : headerDate);

  // Dedup on the original Message-ID where there is one, so forwarding the
  // same alert twice doesn't book it twice. Falling back to a content hash
  // keeps that true for clients that don't preserve it.
  const messageId =
    (h.get("messageid") ?? "").trim() ||
    `fwd-${createHash("sha1").update(`${tokenRow.user_id}|${originalFrom}|${subject}|${bodyText.slice(0, 500)}`).digest("hex").slice(0, 24)}`;

  const { data: trusted } = await supabase
    .from("trusted_senders")
    .select("pattern")
    .eq("user_id", tokenRow.user_id);

  const outcome = await processFetchedEmails(
    supabase,
    tokenRow.user_id,
    [{ messageId, date, from: originalFrom, subject, text: bodyText }],
    (trusted ?? []).map((t) => t.pattern),
    { source: "forward", explicit: true },
  );

  if ("error" in outcome) {
    console.error("[inbound/email]", outcome.error);
    // 500 so CloudMailin retries — this one is our fault and worth redelivering.
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  await supabase
    .from("email_forwarding_tokens")
    .update({
      last_received_at: new Date().toISOString(),
      received_count: (tokenRow.received_count ?? 0) + 1,
    })
    .eq("id", tokenRow.id);

  if (outcome.found > 0) {
    await logAudit(supabase, {
      action: "email_forward.captured",
      entityType: "email_transaction_candidate",
      payload: { unwrapped: fwd.unwrapped, from: originalFrom },
      riskLevel: "low",
      userId: tokenRow.user_id,
    });
  }

  return NextResponse.json({
    ok: true,
    captured: outcome.found,
    // Surfaced so a test forward shows whether the bank was recovered from the
    // quoted headers or whether it fell back to the forwarder's own address.
    unwrapped: fwd.unwrapped,
  });
}
