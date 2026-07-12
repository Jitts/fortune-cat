-- Fortune Goals: savings goals + emergency fund. The goal-directed layer that
-- makes Fortune Cat more than an expense log — what you're saving toward, and
-- (for the emergency fund) whether you're on pace against your real spending.

create table if not exists fortune_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'savings' check (kind in ('savings', 'emergency')),
  target_amount numeric not null check (target_amount > 0),
  target_date date,
  saved_amount numeric not null default 0 check (saved_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists fortune_goals_user_idx on fortune_goals(user_id);

alter table fortune_goals enable row level security;

drop policy if exists "fortune_goals_select" on fortune_goals;
create policy "fortune_goals_select" on fortune_goals
  for select using (auth.uid() = user_id);

drop policy if exists "fortune_goals_insert" on fortune_goals;
create policy "fortune_goals_insert" on fortune_goals
  for insert with check (auth.uid() = user_id);

drop policy if exists "fortune_goals_update" on fortune_goals;
create policy "fortune_goals_update" on fortune_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fortune_goals_delete" on fortune_goals;
create policy "fortune_goals_delete" on fortune_goals
  for delete using (auth.uid() = user_id);
