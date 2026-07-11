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
// trusted-sender rule, "email_review" = accepted from the review tray,
// "csv" = accepted from a bank-statement import.
export type EntrySource = "manual" | "email_auto" | "email_review" | "csv";

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

// Deliberately excludes encrypted_password — never sent to the client.
export type EmailConnection = {
  id: string;
  email: string;
  imap_host: string;
  imap_port: number;
  last_scanned_at: string | null;
  created_at: string;
  oldest_scanned_seq: number | null;
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
  source: "email" | "csv";
};

export type TrustedSender = {
  id: string;
  user_id: string;
  pattern: string;
  created_at: string;
};
