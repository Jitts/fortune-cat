import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export type PendingSender = {
  pattern: string;
  addresses: string[];
  messageCount: number;
  sampleSubject: string | null;
  looksTransactional: boolean;
};

/**
 * Senders we've SEEN but nobody has decided about — the queue behind the
 * Review prompt.
 *
 * A discovery is "decided" once a rule covers its domain. Note the direction
 * of the match: `domain.includes(rule.pattern)`. A rule of "spotify.com"
 * decides the spotify.com domain, but a rule of "billing@spotify.com" does
 * not — that one is about a single address, and the domain as a whole is
 * still an open question. Reversing this comparison would silently mark whole
 * domains as settled on the strength of one address, which is the kind of
 * over-reach this feature exists to remove.
 *
 * Degrades to an empty list if either table is missing, so a pre-migration
 * deploy shows no prompt rather than erroring.
 */
export async function loadPendingSenders(db: Db, userId: string): Promise<PendingSender[]> {
  try {
    const [{ data: discoveries }, { data: rules }] = await Promise.all([
      db
        .from("sender_discoveries")
        .select("pattern, addresses, message_count, sample_subject, looks_transactional")
        .eq("user_id", userId),
      db.from("sender_rules").select("pattern").eq("user_id", userId),
    ]);

    if (!discoveries?.length) return [];
    const patterns = ((rules ?? []) as { pattern: string }[])
      .map((r) => r.pattern.toLowerCase())
      .filter(Boolean);

    return (
      discoveries as {
        pattern: string;
        addresses: string[] | null;
        message_count: number;
        sample_subject: string | null;
        looks_transactional: boolean;
      }[]
    )
      .filter((d) => {
        const domain = d.pattern.toLowerCase();
        return !patterns.some((p) => domain.includes(p));
      })
      .map((d) => ({
        pattern: d.pattern,
        addresses: d.addresses ?? [],
        messageCount: d.message_count,
        sampleSubject: d.sample_subject,
        looksTransactional: d.looks_transactional,
      }))
      .sort(
        (a, b) =>
          Number(b.looksTransactional) - Number(a.looksTransactional) ||
          b.messageCount - a.messageCount,
      );
  } catch {
    return [];
  }
}
