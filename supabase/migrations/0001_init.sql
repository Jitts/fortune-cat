create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  icon text,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
drop policy if exists "categories_v1_read" on categories;
create policy "categories_v1_read" on categories for select using (true);
drop policy if exists "categories_v1_write" on categories;
create policy "categories_v1_write" on categories for all using (true) with check (true);

insert into categories (id, name, icon) values
  ('a1000000-0000-0000-0000-000000000001', 'Food & Drink', '🍜'),
  ('a1000000-0000-0000-0000-000000000002', 'Transport', '🚌'),
  ('a1000000-0000-0000-0000-000000000003', 'Shopping', '🛍️'),
  ('a1000000-0000-0000-0000-000000000004', 'Salary', '💰'),
  ('a1000000-0000-0000-0000-000000000005', 'Utilities', '💡'),
  ('a1000000-0000-0000-0000-000000000006', 'Entertainment', '🎬')
on conflict (id) do nothing;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  type text not null check (type in ('expense', 'income')),
  amount numeric(12,2) not null,
  category_id uuid references categories(id),
  date date not null default current_date,
  note text,
  ai_category text,
  ai_category_source text,
  ai_category_confidence numeric,
  ai_category_review_status text default 'unreviewed',
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;
drop policy if exists "transactions_v1_read" on transactions;
create policy "transactions_v1_read" on transactions for select using (true);
drop policy if exists "transactions_v1_write" on transactions;
create policy "transactions_v1_write" on transactions for all using (true) with check (true);

insert into transactions (id, user_id, type, amount, category_id, date, note) values
  ('b1000000-0000-0000-0000-000000000001', null, 'income',  3200.00, 'a1000000-0000-0000-0000-000000000004', current_date - 20, 'Monthly salary'),
  ('b1000000-0000-0000-0000-000000000002', null, 'expense',   48.50, 'a1000000-0000-0000-0000-000000000001', current_date - 15, 'Dinner with friends'),
  ('b1000000-0000-0000-0000-000000000003', null, 'expense',   22.00, 'a1000000-0000-0000-0000-000000000002', current_date - 12, 'Monthly transit pass'),
  ('b1000000-0000-0000-0000-000000000004', null, 'expense',  134.99, 'a1000000-0000-0000-0000-000000000003', current_date - 8,  'New headphones'),
  ('b1000000-0000-0000-0000-000000000005', null, 'expense',   65.00, 'a1000000-0000-0000-0000-000000000005', current_date - 5,  'Electricity bill'),
  ('b1000000-0000-0000-0000-000000000006', null, 'expense',   19.99, 'a1000000-0000-0000-0000-000000000006', current_date - 2,  'Streaming subscription')
on conflict (id) do nothing;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  stripe_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'refunded')),
  plan text not null default 'pro',
  amount_cents integer,
  currency text default 'usd',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;
drop policy if exists "payments_v1_read" on payments;
create policy "payments_v1_read" on payments for select using (true);
drop policy if exists "payments_v1_write" on payments;
create policy "payments_v1_write" on payments for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  risk_level text default 'low',
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);