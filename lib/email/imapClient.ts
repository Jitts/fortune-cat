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
 * Fetches the most recent messages from INBOX (read-only: no flags, moves,
 * or deletions). Capped to `limit` to stay within a serverless function's
 * time budget.
 */
export async function fetchRecentEmails(
  creds: ImapCredentials,
  limit = 50,
): Promise<FetchedEmail[]> {
  const c = client(creds);
  const results: FetchedEmail[] = [];

  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      const total = c.mailbox && typeof c.mailbox === "object" ? c.mailbox.exists : 0;
      if (total === 0) return results;

      const start = Math.max(1, total - limit + 1);
      for await (const msg of c.fetch(`${start}:*`, { source: true, uid: true })) {
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
