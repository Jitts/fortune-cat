-- Manual recurring bills: a user-entered recurring bill/subscription the radar
-- hasn't (or can't) detect from transaction history yet -- e.g. a home loan
-- paid outside the ledger, or a subscription with no captured charges so far.
-- Merged alongside the detected flows in BillsDue / RecurringRadar so a user
-- with nothing detected yet still has something to see and act on.

create table if not exists manual_recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')) default 'expense',
  amount numeric not null check (amount > 0),
  cadence text not null check (cadence in ('weekly', 'monthly')) default 'monthly',
  next_due_date date not null,
  account_tag text,
  created_at timestamptz not null default now()
);

create index if not exists manual_recurring_bills_user_idx on manual_recurring_bills(user_id);

alter table manual_recurring_bills enable row level security;

drop policy if exists "manual_recurring_bills_select" on manual_recurring_bills;
create policy "manual_recurring_bills_select" on manual_recurring_bills
  for select using (auth.uid() = user_id);

drop policy if exists "manual_recurring_bills_insert" on manual_recurring_bills;
create policy "manual_recurring_bills_insert" on manual_recurring_bills
  for insert with check (auth.uid() = user_id);

drop policy if exists "manual_recurring_bills_update" on manual_recurring_bills;
create policy "manual_recurring_bills_update" on manual_recurring_bills
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "manual_recurring_bills_delete" on manual_recurring_bills;
create policy "manual_recurring_bills_delete" on manual_recurring_bills
  for delete using (auth.uid() = user_id);
