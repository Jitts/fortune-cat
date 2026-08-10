import type { SupabaseClient } from "@supabase/supabase-js";
import type { FetchedEnvelope } from "@/lib/email/imapClient";
import { extractSenderDomain } from "@/lib/email/senderSignals";

// Works with both the RLS-scoped server client (manual scans) and the
// service-role admin client (cron) — every query filters by userId either way.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

/**
 * Sender scoping: deciding which messages a scan is allowed to open, from
 * envelopes alone.
 *
 * A scan used to download every recent message in full and read all of them to
 * find the few that were transactions. Beta testers refused the app-password
 * screen over exactly that, and they were right to — it is a far larger ask
 * than "we read your bank's receipts". Now the scan reads sender lines first
 * and opens only what the user has approved.
 *
 * THE RULE, which the schema comment in 0027 also states because it is the one
 * thing a future change is likely to get wrong: no rule means UNDECIDED, and
 * undecided means NOT OPENED. Absence is never consent. An unknown sender is
 * recorded as a discovery and surfaces in Review to be asked about; it is not
 * read in the meantime.
 */

export type SenderRule = { pattern: string; opened: boolean };

export type Discovery = {
  pattern: string;
  addresses: string[];
  messageCount: number;
  sampleSubject: string;
  looksTransactional: boolean;
};

export type ScopedPlan = {
  /** UIDs of messages we may open, because their sender is approved. */
  openUids: number[];
  /** Senders with no decision yet — the Review prompt is built from these. */
  undecided: Discovery[];
  /** Messages left unopened because their sender is explicitly closed. */
  skippedClosed: number;
  /** Messages left unopened because their sender hasn't been decided yet. */
  skippedUndecided: number;
};

// Subject-line heuristic, used only to sort the prompt so likely banks surface
// first. Never a reason to open anything on its own — a subject is not consent
// either.
const RECEIPT_SUBJECT_RE =
  /\b(receipt|order|invoice|payment|transaction|statement|charged|paid|purchase|debited|credited|alert)\b/i;

/**
 * Every sender rule for a user, longest pattern first.
 *
 * Order matters: patterns are matched as substrings of the whole From address,
 * so both "spotify.com" and "billing@spotify.com" are valid rules and both can
 * match the same message. Sorting by length means the most specific rule wins,
 * which is what lets someone open a domain generally while closing one address
 * within it.
 *
 * Degrades to no rules if the table is missing (pre-migration 0027), which
 * leaves every sender undecided rather than accidentally opening the inbox.
 */
export async function loadSenderRules(db: Db, userId: string): Promise<SenderRule[]> {
  try {
    const { data, error } = await db
      .from("sender_rules")
      .select("pattern, opened")
      .eq("user_id", userId);
    if (error || !data) return [];
    return (data as SenderRule[])
      .map((r) => ({ pattern: r.pattern.toLowerCase(), opened: r.opened }))
      .sort((a, b) => b.pattern.length - a.pattern.length);
  } catch {
    return [];
  }
}

/** The most specific rule matching this address, or null if none do. */
function ruleFor(fromAddress: string, rules: SenderRule[]): SenderRule | null {
  const from = fromAddress.toLowerCase();
  return rules.find((r) => r.pattern && from.includes(r.pattern)) ?? null;
}

/**
 * Splits a batch of envelopes into "may open" and "must ask about", without
 * opening anything.
 */
export function planScopedFetch(envelopes: FetchedEnvelope[], rules: SenderRule[]): ScopedPlan {
  const openUids: number[] = [];
  const pending = new Map<string, Discovery>();
  let skippedClosed = 0;
  let skippedUndecided = 0;

  for (const env of envelopes) {
    if (!env.from) continue;
    const rule = ruleFor(env.from, rules);

    if (rule?.opened) {
      openUids.push(env.uid);
      continue;
    }
    if (rule) {
      skippedClosed += 1;
      continue;
    }

    skippedUndecided += 1;
    const domain = extractSenderDomain(env.from) ?? env.from.toLowerCase().trim();
    if (!domain || domain.length < 3) continue;

    const seen = pending.get(domain);
    const address = env.from.toLowerCase().trim();
    if (seen) {
      seen.messageCount += 1;
      if (!seen.addresses.includes(address)) seen.addresses.push(address);
      // Keep a transaction-looking subject in preference to a marketing one,
      // since that is the one that tells the user why we're asking.
      if (!seen.looksTransactional && RECEIPT_SUBJECT_RE.test(env.subject)) {
        seen.looksTransactional = true;
        seen.sampleSubject = env.subject;
      }
    } else {
      pending.set(domain, {
        pattern: domain,
        addresses: [address],
        messageCount: 1,
        sampleSubject: env.subject,
        looksTransactional: RECEIPT_SUBJECT_RE.test(env.subject),
      });
    }
  }

  // Likely receipt senders first, then by how much they write.
  const undecided = [...pending.values()].sort(
    (a, b) =>
      Number(b.looksTransactional) - Number(a.looksTransactional) ||
      b.messageCount - a.messageCount,
  );

  return { openUids, undecided, skippedClosed, skippedUndecided };
}

/**
 * Persists what the envelope pass saw, so Review can ask about it later and
 * between scans.
 *
 * Merges rather than overwrites: counts accumulate and addresses union, so a
 * sender that wrote once a month for six months reads as six, not one. Failure
 * is swallowed — a discovery is a convenience for the prompt, and losing one
 * must never fail a scan that otherwise worked.
 */
export async function recordDiscoveries(
  db: Db,
  userId: string,
  discoveries: Discovery[],
): Promise<void> {
  if (discoveries.length === 0) return;
  try {
    const { data: existing } = await db
      .from("sender_discoveries")
      .select("pattern, addresses, message_count")
      .eq("user_id", userId)
      .in(
        "pattern",
        discoveries.map((d) => d.pattern),
      );

    const prior = new Map(
      ((existing ?? []) as { pattern: string; addresses: string[]; message_count: number }[]).map(
        (r) => [r.pattern, r],
      ),
    );

    const now = new Date().toISOString();
    const rows = discoveries.map((d) => {
      const was = prior.get(d.pattern);
      return {
        user_id: userId,
        pattern: d.pattern,
        addresses: [...new Set([...(was?.addresses ?? []), ...d.addresses])],
        message_count: (was?.message_count ?? 0) + d.messageCount,
        sample_subject: d.sampleSubject.slice(0, 200),
        looks_transactional: d.looksTransactional,
        last_seen_at: now,
      };
    });

    await db.from("sender_discoveries").upsert(rows, { onConflict: "user_id,pattern" });
  } catch {
    // Non-fatal by design — see the doc comment.
  }
}
