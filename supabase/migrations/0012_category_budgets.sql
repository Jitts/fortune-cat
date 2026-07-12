-- Fortune Budget: a monthly spending limit per category. Spend is derived from
-- the current month's expense transactions grouped by category; this table just
-- holds the ceilings the user sets. One budget per category per user.

create table if not exists category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists category_budgets_user_idx on category_budgets(user_id);

alter table category_budgets enable row level security;

drop policy if exists "category_budgets_select" on category_budgets;
create policy "category_budgets_select" on category_budgets
  for select using (auth.uid() = user_id);

drop policy if exists "category_budgets_insert" on category_budgets;
create policy "category_budgets_insert" on category_budgets
  for insert with check (auth.uid() = user_id);

drop policy if exists "category_budgets_update" on category_budgets;
create policy "category_budgets_update" on category_budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "category_budgets_delete" on category_budgets;
create policy "category_budgets_delete" on category_budgets
  for delete using (auth.uid() = user_id);
