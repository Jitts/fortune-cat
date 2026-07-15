-- Daily Fortune Slip: a once-a-day "slip" the user draws, whose face is a pure
-- deterministic function of that day's captured cash-flow signals (no LLM, no
-- randomness). One row per user per local date — drawing persists so the slip is
-- stable across reloads and consecutive rows power a "fortune streak".

create table if not exists fortune_slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slip_date date not null,
  severity text not null check (severity in ('great', 'good', 'even', 'caution')),
  fortune_word text not null,
  headline text not null,
  drawn_at timestamptz not null default now(),
  unique (user_id, slip_date)
);

create index if not exists fortune_slips_user_idx on fortune_slips(user_id);

alter table fortune_slips enable row level security;

drop policy if exists "fortune_slips_select" on fortune_slips;
create policy "fortune_slips_select" on fortune_slips
  for select using (auth.uid() = user_id);

drop policy if exists "fortune_slips_insert" on fortune_slips;
create policy "fortune_slips_insert" on fortune_slips
  for insert with check (auth.uid() = user_id);

drop policy if exists "fortune_slips_update" on fortune_slips;
create policy "fortune_slips_update" on fortune_slips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fortune_slips_delete" on fortune_slips;
create policy "fortune_slips_delete" on fortune_slips
  for delete using (auth.uid() = user_id);
