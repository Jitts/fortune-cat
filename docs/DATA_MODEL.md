# Data Model

## categories
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NULL | owner (null = system default) |
| name | text | e.g. "Food & Drink" |
| icon | text | emoji |
| created_at | timestamptz | |

## transactions
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NULL | owner |
| type | text | 'expense' \| 'income' |
| amount | numeric(12,2) | positive |
| category_id | uuid FK → categories | |
| date | date | |
| note | text NULL | |
| ai_category | text NULL | AI-suggested label |
| ai_category_source | text NULL | model + prompt version |
| ai_category_confidence | numeric NULL | 0–1 |
| ai_category_review_status | text | 'unreviewed'\|'accepted'\|'rejected' |
| created_at | timestamptz | |

## payments
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NULL | |
| stripe_session_id | text | |
| stripe_customer_id | text | |
| stripe_subscription_id | text NULL | |
| status | text | pending\|active\|cancelled\|refunded |
| plan | text | 'pro' |
| amount_cents | integer | |
| currency | text | |
| paid_at | timestamptz NULL | |
| created_at | timestamptz | |

## audit_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NULL | |
| action | text | e.g. 'transaction.created' |
| entity_type | text | |
| entity_id | uuid NULL | |
| payload | jsonb | before/after snapshot |
| risk_level | text | low\|medium\|high\|critical |
| created_at | timestamptz | |

**RLS:** All tables use open v1 policies (select/all = true). Replaced with `auth.uid() = user_id` in Sprint 3.
