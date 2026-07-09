export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  created_at: string;
};

export type TransactionType = "expense" | "income";

export type AiReviewStatus = "unreviewed" | "accepted" | "rejected";

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
