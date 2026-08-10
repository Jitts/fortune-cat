import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { htmlToText } from "html-to-text";

export type ImapCredentials = {
  host: string;
  port: number;
  email: string;
  password: string;
};

export type FetchedEmail = {
  messageId: string;
  date: Date;
  from: string;
  subject: string;
  text: string;
};

export type FetchedBatch = {
  emails: FetchedEmail[];
  // Lowest IMAP sequence number included in this batch — null when the
  // mailbox is empty, or when a "fetch older" call is already at the start
  // of the mailbox and there's nothing further back to fetch.
  oldestSeq: number | null;
  // true once a batch reaches sequence 1 — there is nothing older to scan.
  reachedStart: boolean;
};

// mailparser only auto-derives `.text` from `.html` when the HTML part is
// the document root or sits inside a `multipart/alternative` — a bare
// `multipart/mixed` > `text/html` structure with no `text/plain` sibling
// (common for bank/marketing templates with inline header images) leaves
// `.text` undefined even though there's a perfectly readable HTML body.
// Fall back to converting the HTML ourselves so we don't silently scan an
// empty string for these emails.
function extractText(parsed: { text?: string; html?: string | false }): string {
  if (parsed.text) return parsed.text;
  if (parsed.html) return htmlToText(parsed.html);
  return "";
}

function describeImapError(err: unknown): string {
  if (err && typeof err === "object") {
    const responseText = "responseText" in err ? String(err.responseText) : null;
    if (responseText) return responseText;
  }
  return err instanceof Error ? err.message : "Connection failed.";
}

function client(creds: ImapCredentials) {
  return new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: true,
    auth: { user: creds.email, pass: creds.password },
    logger: false,
  });
}

/** Verifies credentials work by connecting and logging out immediately — never reads any mail. */
export async function testImapConnection(
  creds: ImapCredentials,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = client(creds);
  try {
    await c.connect();
    await c.logout();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeImapError(err) };
  } finally {
    c.close();
  }
}

/**
 * A message's envelope — who sent it, what it's called, when it arrived. No
 * body, ever. This is the discovery half of a scoped scan: enough to ask
 * "may we open mail from this sender?" without having opened anything.
 */
export type FetchedEnvelope = {
  uid: number;
  from: string;
  subject: string;
  date: Date;
};

export type EnvelopeBatch = {
  envelopes: FetchedEnvelope[];
  oldestSeq: number | null;
  reachedStart: boolean;
};

async function fetchEnvelopeRange(
  creds: ImapCredentials,
  startSeq: number,
  endSeq: number,
): Promise<FetchedEnvelope[]> {
  const c = client(creds);
  const results: FetchedEnvelope[] = [];

  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      // `envelope` instead of `source`: the server returns parsed header
      // fields and never transmits the body. The difference between this and
      // the fetch below is the entire point of sender scoping.
      for await (const msg of c.fetch(`${startSeq}:${endSeq}`, { envelope: true, uid: true })) {
        const env = msg.envelope;
        const sender = env?.from?.[0];
        results.push({
          uid: msg.uid,
          // Prefer the bare address; imapflow splits it out of the display name.
          from: sender?.address ?? sender?.name ?? "",
          subject: env?.subject ?? "",
          date: env?.date ?? new Date(),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => c.close());
  }

  return results;
}

/** Envelopes for the most recent `limit` messages. Reads no bodies. */
export async function fetchRecentEnvelopes(
  creds: ImapCredentials,
  limit = 50,
): Promise<EnvelopeBatch> {
  const total = await mailboxSize(creds);
  if (total === 0) return { envelopes: [], oldestSeq: null, reachedStart: true };

  const start = Math.max(1, total - limit + 1);
  const envelopes = await fetchEnvelopeRange(creds, start, total);
  return { envelopes, oldestSeq: start, reachedStart: start <= 1 };
}

/** Envelopes for the batch immediately before `beforeSeq`. Reads no bodies. */
export async function fetchOlderEnvelopes(
  creds: ImapCredentials,
  beforeSeq: number,
  limit = 50,
): Promise<EnvelopeBatch> {
  const endSeq = beforeSeq - 1;
  if (endSeq < 1) return { envelopes: [], oldestSeq: beforeSeq, reachedStart: true };

  const start = Math.max(1, endSeq - limit + 1);
  const envelopes = await fetchEnvelopeRange(creds, start, endSeq);
  return { envelopes, oldestSeq: start, reachedStart: start <= 1 };
}

/**
 * Full messages for specific UIDs — the "open" half of a scoped scan, called
 * only for senders the user has approved. UIDs rather than sequence numbers
 * because sequence numbers shift when mail arrives between the two passes,
 * while a UID keeps pointing at the message we actually decided about.
 */
export async function fetchBodiesByUid(
  creds: ImapCredentials,
  uids: number[],
): Promise<FetchedEmail[]> {
  if (uids.length === 0) return [];

  const c = client(creds);
  const results: FetchedEmail[] = [];

  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      for await (const msg of c.fetch(uids, { source: true, uid: true }, { uid: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        results.push({
          messageId: parsed.messageId ?? `uid-${msg.uid}@${creds.email}`,
          date: parsed.date ?? new Date(),
          from: parsed.from?.text ?? "",
          subject: parsed.subject ?? "",
          text: extractText(parsed),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => c.close());
  }

  return results;
}

/** Message count in INBOX, via a connect-and-release with no fetch. */
async function mailboxSize(creds: ImapCredentials): Promise<number> {
  const c = client(creds);
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    lock.release();
    return c.mailbox && typeof c.mailbox === "object" ? c.mailbox.exists : 0;
  } finally {
    await c.logout().catch(() => c.close());
  }
}

async function fetchSequenceRange(
  creds: ImapCredentials,
  startSeq: number,
  endSeq: number,
): Promise<FetchedEmail[]> {
  const c = client(creds);
  const results: FetchedEmail[] = [];

  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      for await (const msg of c.fetch(`${startSeq}:${endSeq}`, { source: true, uid: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        results.push({
          messageId: parsed.messageId ?? `uid-${msg.uid}@${creds.email}`,
          date: parsed.date ?? new Date(),
          from: parsed.from?.text ?? "",
          subject: parsed.subject ?? "",
          text: extractText(parsed),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => c.close());
  }

  return results;
}

/**
 * Fetches the most recent messages from INBOX (read-only: no flags, moves,
 * or deletions). Capped to `limit` to stay within a serverless function's
 * time budget. Returns the lowest sequence number included, so a later
 * `fetchOlderEmails` call can continue further back from there.
 */
export async function fetchRecentEmails(creds: ImapCredentials, limit = 50): Promise<FetchedBatch> {
  const total = await mailboxSize(creds);
  if (total === 0) return { emails: [], oldestSeq: null, reachedStart: true };

  const start = Math.max(1, total - limit + 1);
  const emails = await fetchSequenceRange(creds, start, total);
  return { emails, oldestSeq: start, reachedStart: start <= 1 };
}

/**
 * Fetches the batch of `limit` messages immediately before `beforeSeq` —
 * i.e. continues scanning further back in time from wherever a previous
 * scan (recent or older) left off. Read-only, same time-budget rationale
 * as `fetchRecentEmails`.
 */
export async function fetchOlderEmails(
  creds: ImapCredentials,
  beforeSeq: number,
  limit = 50,
): Promise<FetchedBatch> {
  const endSeq = beforeSeq - 1;
  if (endSeq < 1) return { emails: [], oldestSeq: beforeSeq, reachedStart: true };

  const start = Math.max(1, endSeq - limit + 1);
  const emails = await fetchSequenceRange(creds, start, endSeq);
  return { emails, oldestSeq: start, reachedStart: start <= 1 };
}
