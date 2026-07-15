-- Balance anchor: the optional half of the hybrid Safe-to-Spend model. The
-- engine works with zero setup (month-flow: income − spent − bills − set-asides),
-- but a user can "reconcile" by confirming their real account balance. The
-- latest row per user is the current anchor; a new reconcile inserts a new row
-- (history kept). Nullable/opt-in — nothing depends on a row existing.

create table if not exists balance_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  balance numeric not null check (balance >= 0),
  anchored_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists balance_anchors_user_idx on balance_anchors(user_id);

alter table balance_anchors enable row level security;

drop policy if exists "balance_anchors_select" on balance_anchors;
create policy "balance_anchors_select" on balance_anchors
  for select using (auth.uid() = user_id);

drop policy if exists "balance_anchors_insert" on balance_anchors;
create policy "balance_anchors_insert" on balance_anchors
  for insert with check (auth.uid() = user_id);

drop policy if exists "balance_anchors_update" on balance_anchors;
create policy "balance_anchors_update" on balance_anchors
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "balance_anchors_delete" on balance_anchors;
create policy "balance_anchors_delete" on balance_anchors
  for delete using (auth.uid() = user_id);
