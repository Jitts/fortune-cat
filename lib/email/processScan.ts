import type { SupabaseClient } from "@supabase/supabase-js";
import { parseEmailForTransaction } from "@/lib/email/parseCandidate";
import { suggestAccountTag } from "@/lib/email/accountTag";
import { convertToBase } from "@/lib/fx";
import { getBaseCurrency, getProfileByUserId } from "@/lib/profile";
import { extractSenderDomain, getGraduatedDomains } from "@/lib/email/senderSignals";
import type { FetchedEmail } from "@/lib/email/imapClient";

// Works with both the RLS-scoped server client (manual scans) and the
// service-role admin client (cron) — every query still filters by userId so
// the admin path can never cross users.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>;

export type ScanOutcome = {
  found: number;
  autoPosted: number;
};

type CandidateRow = {
  id: string;
  amount: number | null;
  email_date: string | null;
  suggested_type: string | null;
  suggested_category: string | null;
  suggested_note: string | null;
  account_tag: string | null;
  original_amount: number | null;
  original_currency: string | null;
  auto_posted: boolean;
};

async function lookupCategoryId(
  supabase: Db,
  userId: string,
  categoryName: string | null,
): Promise<string | null> {
  if (!categoryName) return null;
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("name", categoryName)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Creates a ledger transaction from a candidate row; returns the new transaction id. */
export async function createTransactionFromCandidate(
  supabase: Db,
  userId: string,
  candidate: CandidateRow,
  entrySource: "email_auto" | "email_review" | "csv" | "sms",
): Promise<{ id: string } | { error: string }> {
  const categoryId = await lookupCategoryId(supabase, userId, candidate.suggested_category);

  // The ledger holds the user's base currency. If a foreign capture never got
  // converted (the rate lookup missed at scan time, so the amount is still the
  // raw foreign figure), retry the conversion now. Guarded to amount ==
  // original_amount so a value the user already edited, or one converted at
  // capture, is left untouched.
  let amount = candidate.amount ?? 0;
  if (
    candidate.original_currency &&
    candidate.original_amount != null &&
    Number(amount) === Number(candidate.original_amount)
  ) {
    const base = await getBaseCurrency(supabase, userId);
    if (candidate.original_currency !== base) {
      const fx = await convertToBase(Number(candidate.original_amount), candidate.original_currency, base);
      if (fx) amount = fx.base;
    }
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: candidate.suggested_type ?? "expense",
      amount,
      category_id: categoryId,
      date: (candidate.email_date ?? new Date().toISOString()).slice(0, 10),
      note: candidate.suggested_note,
      ai_category: candidate.suggested_category,
      ai_category_source: "email_import",
      ai_category_review_status: "accepted",
      entry_source: entrySource,
      account_tag: candidate.account_tag,
      original_amount: candidate.original_amount,
      original_currency: candidate.original_currency,
    })
    .select("id")
    .single();

  if (error || !transaction) {
    console.error("[createTransactionFromCandidate]", error);
    return { error: "Could not save the transaction." };
  }
  return { id: transaction.id };
}

/**
 * The shared brain behind every scan (manual, scan-older, and cron):
 * parse each email, convert foreign currency, then either auto-post
 * (trusted sender + SGD + rule-clean) or stage for review with a stated
 * reason. Dedup by (user_id, message_id) means rescans never double-post.
 */
export type ProcessOptions = {
  // Channel-specific parsing/tagging — email is the default; the SMS inbound
  // route supplies its own (bank SMS wording differs from email alerts).
  parser?: (
    subject: string,
    text: string,
    defaultCurrency: string,
  ) => ReturnType<typeof parseEmailForTransaction>;
  accountTagger?: (from: string, text: string) => string | null;
  source?: "email" | "sms" | "forward";
  /**
   * The person picked this exact message by hand — currently only forwarding.
   * It changes three things, all in the same direction: their choice governs,
   * and nothing automatic may override it.
   *
   *  - Never auto-posts, even from a trusted sender. This is the load-bearing
   *    one. A forwarding address travels in the To: header of every message
   *    sent to it, so anyone who has seen one can send to it. Auto-posting
   *    would turn a semi-public address into a way to write straight into
   *    someone's ledger. Review is the whole defence.
   *  - Standing blocks and the cross-user filter don't drop it. Both are
   *    guesses about mail nobody looked at; forwarding is a person deciding
   *    about a message in front of them. Silently discarding it would read as
   *    the feature being broken.
   *  - No "unrecognised sender" note. They recognised it — that's why it's here.
   */
  explicit?: boolean;
};

export async function processFetchedEmails(
  supabase: Db,
  userId: string,
  emails: FetchedEmail[],
  trustedPatterns: string[],
  options: ProcessOptions = {},
): Promise<ScanOutcome | { error: string }> {
  const parser = options.parser ?? parseEmailForTransaction;
  const accountTagger = options.accountTagger ?? suggestAccountTag;
  const source = options.source ?? "email";
  const patterns = trustedPatterns.map((p) => p.toLowerCase()).filter(Boolean);
  // Blocked senders are skipped before parsing — loaded here so every caller
  // (manual scan, scan-older, cron, SMS) gets the same guard. A missing table
  // (pre-migration 0022) errors into null → nothing blocked, scans unaffected.
  const { data: blockedRows } = await supabase
    .from("blocked_senders")
    .select("pattern")
    .eq("user_id", userId);
  const blocked = ((blockedRows ?? []) as { pattern: string }[])
    .map((r) => r.pattern.toLowerCase())
    .filter(Boolean);
  // Domains the collaborative filter has graduated (blocked by enough
  // distinct OTHER users) — see lib/email/senderSignals.ts. Best-effort and
  // always resolves (never throws), so a signal-table hiccup never blocks a
  // scan; it just means nothing graduates that round.
  const graduated = await getGraduatedDomains();
  // The user's own currency — anything else is "foreign" and routes to review.
  // Their locale comes along because the review text quotes the foreign amount
  // back to them, and it should read the way their own money does.
  const { currency: baseCurrency, locale: baseLocale } = await getProfileByUserId(
    supabase,
    userId,
  );

  const explicit = options.explicit === true;

  const candidateRows = [];
  for (const mail of emails) {
    const from = mail.from.toLowerCase();
    if (!explicit && blocked.some((p) => from.includes(p))) continue;

    const parsed = parser(mail.subject, mail.text, baseCurrency);
    if (!parsed) continue;

    const foreign = parsed.currency !== baseCurrency;
    let amount = parsed.amount;
    let reviewReason: string | null = null;

    if (foreign) {
      // Foreign currency ALWAYS routes to review — a guessed rate never
      // silently enters the ledger. Conversion just prefills the number.
      const fx = await convertToBase(parsed.amount, parsed.currency, baseCurrency);
      if (fx) {
        amount = fx.base;
        reviewReason = `${parsed.currency} ${parsed.amount.toLocaleString(baseLocale)} @ ${fx.rate.toFixed(4)} — confirm the rate`;
      } else {
        reviewReason = `${parsed.currency} ${parsed.amount.toLocaleString(baseLocale)} — rate unavailable, edit the ${baseCurrency} amount`;
      }
    }

    const trusted = patterns.some((p) => from.includes(p));
    if (!trusted && !reviewReason && !explicit) reviewReason = "unrecognised sender";

    // A personal "trust" always wins over the collaborative filter — otherwise
    // trusting a sender would be meaningless the moment enough other users
    // block that same domain. Personal "block" already short-circuited above.
    const senderDomain = extractSenderDomain(mail.from);
    const graduatedCount =
      !trusted && !explicit && senderDomain ? graduated.get(senderDomain) : undefined;
    const filtered = graduatedCount != null;

    // `!explicit` is the guard that keeps a spoofable inbound address from
    // writing straight into the ledger. See ProcessOptions.explicit.
    const autoPost = trusted && !foreign && !explicit;

    candidateRows.push({
      user_id: userId,
      message_id: mail.messageId,
      email_date: mail.date.toISOString(),
      from_address: mail.from,
      subject: mail.subject,
      amount,
      suggested_type: parsed.type,
      suggested_category: parsed.category,
      suggested_note: parsed.note,
      raw_snippet: mail.text.trim().slice(0, 200),
      account_tag: accountTagger(mail.from, mail.text),
      original_amount: foreign ? parsed.amount : null,
      original_currency: foreign ? parsed.currency : null,
      review_reason: autoPost
        ? null
        : filtered
          ? `filtered — blocked by ${graduatedCount} other users as likely unwanted`
          : reviewReason,
      auto_posted: autoPost,
      status: autoPost ? "accepted" : filtered ? "filtered" : "pending",
      source,
    });
  }

  if (candidateRows.length === 0) return { found: 0, autoPosted: 0 };

  // ignoreDuplicates means only genuinely-new rows come back — critical so a
  // rescan of the same window can never create a second transaction.
  const { data: inserted, error } = await supabase
    .from("email_transaction_candidates")
    .upsert(candidateRows, { onConflict: "user_id,message_id", ignoreDuplicates: true })
    .select(
      "id, amount, email_date, suggested_type, suggested_category, suggested_note, account_tag, original_amount, original_currency, auto_posted",
    );

  if (error) {
    console.error("[processFetchedEmails] insert candidates", error);
    return { error: "Scan found matches but could not save them — please try again." };
  }

  let autoPosted = 0;
  for (const candidate of (inserted ?? []) as CandidateRow[]) {
    if (!candidate.auto_posted) continue;
    const result = await createTransactionFromCandidate(supabase, userId, candidate, "email_auto");
    if ("error" in result) {
      // Fail open into review rather than losing the capture.
      await supabase
        .from("email_transaction_candidates")
        .update({ status: "pending", auto_posted: false, review_reason: "auto-post failed — accept manually" })
        .eq("id", candidate.id);
      continue;
    }
    await supabase
      .from("email_transaction_candidates")
      .update({ transaction_id: result.id })
      .eq("id", candidate.id);
    autoPosted += 1;
  }

  return { found: inserted?.length ?? 0, autoPosted };
}
