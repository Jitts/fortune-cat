-- Goal achievements: a durable, append-only record of Fortune Goals the user
-- has met, so they can look back over a year and see which wishes came true.
--
-- Why a separate table (not just an achieved_at column on fortune_goals):
-- goals are mutable and deletable. A user can raise a target after hitting it,
-- or delete a finished goal to tidy the list. Either would erase the milestone.
-- This ledger snapshots name/kind/target at the moment of completion and keeps
-- the row even if the goal is later edited or deleted (goal_id -> null on
-- delete). One achievement per goal (first time saved crosses target).

create table if not exists goal_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references fortune_goals(id) on delete set null,
  name text not null,
  kind text not null default 'savings' check (kind in ('savings', 'emergency')),
  target_amount numeric not null check (target_amount > 0),
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists goal_achievements_user_idx on goal_achievements(user_id);

-- One achievement per goal while the goal exists; deleted goals (goal_id null)
-- are exempt from the uniqueness check, so their milestones can coexist.
create unique index if not exists goal_achievements_goal_uniq
  on goal_achievements(goal_id) where goal_id is not null;

alter table goal_achievements enable row level security;

-- Owner-only, and immutable: a user can read and record their own milestones,
-- but there is deliberately NO update or delete policy — a "year in review"
-- ledger shouldn't be quietly rewritten. Account deletion still wipes it via
-- the user_id cascade (and the explicit account-delete sweep).
drop policy if exists "goal_achievements_select" on goal_achievements;
create policy "goal_achievements_select" on goal_achievements
  for select using (auth.uid() = user_id);

drop policy if exists "goal_achievements_insert" on goal_achievements;
create policy "goal_achievements_insert" on goal_achievements
  for insert with check (auth.uid() = user_id);

-- Backfill: any goal already at or over its target becomes a win the moment
-- this migration runs, so goals met before the feature shipped still show up.
-- The true completion date isn't recorded historically, so achieved_at defaults
-- to now() (the migration moment). Idempotent via the partial unique index.
insert into goal_achievements (user_id, goal_id, name, kind, target_amount)
select user_id, id, name, kind, target_amount
from fortune_goals
where saved_amount >= target_amount
on conflict (goal_id) where goal_id is not null do nothing;
