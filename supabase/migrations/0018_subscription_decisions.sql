-- Subscription decisions: the persisted verdict for each detected subscription
-- in the kill-chain (keep / cancelling / cancelled). One row per user per
-- merchant. monthly_amount is snapshotted at decision time so the "money freed"
-- tally survives even if the charge later stops appearing in the ledger.

create table if not exists subscription_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_key text not null,
  status text not null check (status in ('keep', 'cancelling', 'cancelled')),
  monthly_amount numeric,
  decided_at timestamptz not null default now(),
  unique (user_id, merchant_key)
);

create index if not exists subscription_decisions_user_idx on subscription_decisions(user_id);

alter table subscription_decisions enable row level security;

drop policy if exists "subscription_decisions_select" on subscription_decisions;
create policy "subscription_decisions_select" on subscription_decisions
  for select using (auth.uid() = user_id);

drop policy if exists "subscription_decisions_insert" on subscription_decisions;
create policy "subscription_decisions_insert" on subscription_decisions
  for insert with check (auth.uid() = user_id);

drop policy if exists "subscription_decisions_update" on subscription_decisions;
create policy "subscription_decisions_update" on subscription_decisions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subscription_decisions_delete" on subscription_decisions;
create policy "subscription_decisions_delete" on subscription_decisions
  for delete using (auth.uid() = user_id);
