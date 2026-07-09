-- Email inbox import (generic IMAP): a user can connect their own inbox
-- (read-only — we only ever fetch/parse, never write to the mailbox) and
-- scan it for receipt-like emails. Parsed results are staged as candidates
-- for the user to accept/dismiss — nothing writes to `transactions` until
-- explicitly accepted.

create table if not exists email_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  imap_host text not null,
  imap_port integer not null default 993,
  encrypted_password text not null,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

alter table email_connections enable row level security;
create policy "email_connections_owner_select" on email_connections
  for select using (auth.uid() = user_id);
create policy "email_connections_owner_insert" on email_connections
  for insert with check (auth.uid() = user_id);
create policy "email_connections_owner_update" on email_connections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "email_connections_owner_delete" on email_connections
  for delete using (auth.uid() = user_id);

create table if not exists email_transaction_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  message_id text not null,
  email_date timestamptz,
  from_address text,
  subject text,
  amount numeric(12,2),
  suggested_type text check (suggested_type in ('expense', 'income')),
  suggested_category text,
  suggested_note text,
  raw_snippet text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists email_candidates_user_status_idx
  on email_transaction_candidates(user_id, status);

alter table email_transaction_candidates enable row level security;
create policy "email_candidates_owner_select" on email_transaction_candidates
  for select using (auth.uid() = user_id);
create policy "email_candidates_owner_insert" on email_transaction_candidates
  for insert with check (auth.uid() = user_id);
create policy "email_candidates_owner_update" on email_transaction_candidates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "email_candidates_owner_delete" on email_transaction_candidates
  for delete using (auth.uid() = user_id);
