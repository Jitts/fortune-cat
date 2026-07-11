-- Flow phase 1: trusted-sender auto-posting, provenance, account tags, FX.

-- A sender pattern (usually a domain like "dbs.com") the user has explicitly
-- trusted: SGD transactions parsed from matching senders post straight to the
-- ledger instead of waiting in review. Auto-posting NEVER happens without a
-- row here — the user always opts in per sender.
create table if not exists trusted_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  pattern text not null,
  created_at timestamptz not null default now(),
  unique (user_id, pattern)
);

alter table trusted_senders enable row level security;
drop policy if exists "trusted_senders_owner_select" on trusted_senders;
create policy "trusted_senders_owner_select" on trusted_senders
  for select using (auth.uid() = user_id);
drop policy if exists "trusted_senders_owner_insert" on trusted_senders;
create policy "trusted_senders_owner_insert" on trusted_senders
  for insert with check (auth.uid() = user_id);
drop policy if exists "trusted_senders_owner_delete" on trusted_senders;
create policy "trusted_senders_owner_delete" on trusted_senders
  for delete using (auth.uid() = user_id);

-- Provenance + account tag + original-currency details on the ledger itself.
alter table transactions
  add column if not exists entry_source text not null default 'manual',
  add column if not exists account_tag text,
  add column if not exists original_amount numeric(14,2),
  add column if not exists original_currency text;

-- Candidates carry the same details, plus why they stopped in review and a
-- link to the transaction they created (for one-tap undo of auto-posts).
alter table email_transaction_candidates
  add column if not exists account_tag text,
  add column if not exists original_amount numeric(14,2),
  add column if not exists original_currency text,
  add column if not exists review_reason text,
  add column if not exists auto_posted boolean not null default false,
  add column if not exists transaction_id uuid;
