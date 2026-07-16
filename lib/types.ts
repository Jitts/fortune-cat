export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  created_at: string;
};

export type TransactionType = "expense" | "income";

export type AiReviewStatus = "unreviewed" | "accepted" | "rejected";

// Provenance: how a row entered the ledger. "email_auto" = posted by a
// trusted-sender rule (any channel), "email_review" = accepted from the review
// tray (email), "sms" = accepted from the review tray (SMS), "csv" = accepted
// from a statement import (CSV/PDF/screenshot).
export type EntrySource = "manual" | "email_auto" | "email_review" | "csv" | "sms";

export type Transaction = {
  id: string;
  user_id: string | null;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  date: string;
  note: string | null;
  ai_category: string | null;
  ai_category_source: string | null;
  ai_category_confidence: number | null;
  ai_category_review_status: AiReviewStatus;
  created_at: string;
  entry_source: EntrySource;
  account_tag: string | null;
  original_amount: number | null;
  original_currency: string | null;
};

export type Payment = {
  id: string;
  user_id: string | null;
  stripe_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: "pending" | "active" | "cancelled" | "refunded";
  plan: string;
  amount_cents: number | null;
  currency: string | null;
  paid_at: string | null;
  created_at: string;
};

export type FeatureRequest = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  vote_count: number;
  created_at: string;
  hasVoted?: boolean;
};

// How an inbox authenticates: an IMAP app password, or Microsoft OAuth
// (sign-in). OAuth inboxes have no imap_host / password.
export type EmailAuthType = "imap" | "microsoft";

// Deliberately excludes encrypted_password and the OAuth tokens — never sent to
// the client.
export type EmailConnection = {
  id: string;
  email: string;
  imap_host: string | null;
  imap_port: number;
  last_scanned_at: string | null;
  created_at: string;
  oldest_scanned_seq: number | null;
  auth_type: EmailAuthType;
};

export type EmailCandidateStatus = "pending" | "accepted" | "dismissed";

export type EmailTransactionCandidate = {
  id: string;
  user_id: string;
  message_id: string;
  email_date: string | null;
  from_address: string | null;
  subject: string | null;
  amount: number | null;
  suggested_type: TransactionType | null;
  suggested_category: string | null;
  suggested_note: string | null;
  raw_snippet: string | null;
  status: EmailCandidateStatus;
  created_at: string;
  account_tag: string | null;
  original_amount: number | null;
  original_currency: string | null;
  review_reason: string | null;
  auto_posted: boolean;
  transaction_id: string | null;
  source: "email" | "csv" | "pdf" | "image" | "sms";
};

// The capture trail behind a posted transaction — joined from its candidate by
// transaction_id so a row can be double-checked against the original source.
export type TransactionProvenance = {
  transaction_id: string;
  source: "email" | "csv" | "pdf" | "image" | "sms";
  from_address: string | null;
  subject: string | null;
  raw_snippet: string | null;
  message_id: string;
  email_date: string | null;
  review_reason: string | null;
  auto_posted: boolean;
};

// Deliberately excludes nothing sensitive beyond the token itself — the token
// is the user's own webhook credential, shown once on the Capture screen.
export type SmsTokenInfo = {
  token: string;
  created_at: string;
  last_received_at: string | null;
};

export type TrustedSender = {
  id: string;
  user_id: string;
  pattern: string;
  created_at: string;
};

export type BlockedSender = {
  id: string;
  user_id: string;
  pattern: string;
  created_at: string;
};

// A Fortune Goal — the goal-directed layer. "emergency" is a savings goal whose
// target is anchored to the user's real monthly spending (N months of expenses).
export type FortuneGoalKind = "savings" | "emergency";

export type FortuneGoal = {
  id: string;
  user_id: string | null;
  name: string;
  kind: FortuneGoalKind;
  target_amount: number;
  target_date: string | null;
  saved_amount: number;
  created_at: string;
};

// A drawn daily fortune slip (one row per user per local date). The face is
// computed deterministically by lib/fortune.ts and frozen here on draw.
export type SlipSeverity = "great" | "good" | "even" | "caution";

export type FortuneSlipRow = {
  id: string;
  user_id: string | null;
  slip_date: string; // yyyy-mm-dd
  severity: SlipSeverity;
  fortune_word: string;
  headline: string;
  detail: string | null; // concrete observation — nearest bill, or a category-pace read
  recommendation: string | null; // Pro-only actionable daily cap, null on free/no-signal
  drawn_at: string;
};

// The user's verdict on a detected subscription (kill-chain). One per user per
// merchant; monthly_amount is snapshotted so the "freed" tally is stable.
export type SubscriptionStatus = "keep" | "cancelling" | "cancelled";

export type SubscriptionDecision = {
  id: string;
  user_id: string | null;
  merchant_key: string;
  status: SubscriptionStatus;
  monthly_amount: number | null;
  decided_at: string;
};

// An optional confirmed account balance — the anchor for Safe-to-Spend's
// higher-precision mode. Latest row per user wins; a reconcile inserts anew.
export type BalanceAnchor = {
  id: string;
  user_id: string | null;
  balance: number;
  anchored_at: string;
  created_at: string;
};

// A monthly spending ceiling for one category. Spend is derived from the
// current month's expense transactions — this row is just the limit.
export type CategoryBudget = {
  id: string;
  user_id: string | null;
  category_id: string;
  monthly_limit: number;
  created_at: string;
};

// A user-entered recurring bill/subscription — fills the gap before the radar
// has captured enough history to detect it on its own, or for bills paid
// outside the ledger entirely (e.g. a home loan via GIRO).
export type BillCadence = "weekly" | "monthly";

export type ManualRecurringBill = {
  id: string;
  user_id: string | null;
  name: string;
  type: TransactionType;
  amount: number;
  cadence: BillCadence;
  next_due_date: string; // yyyy-mm-dd
  account_tag: string | null;
  created_at: string;
};
