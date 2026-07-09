import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

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
          text: parsed.text ?? "",
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
  const c = client(creds);
  let total = 0;
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    lock.release();
    total = c.mailbox && typeof c.mailbox === "object" ? c.mailbox.exists : 0;
  } finally {
    await c.logout().catch(() => c.close());
  }

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
