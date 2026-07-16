-- Block sender: the mirror of "trust sender". A blocked pattern makes every
-- future scan skip that sender entirely (no candidate, no review noise), and
-- blocking also dismisses the sender's currently-pending review items.
--
-- sender_signals is the anonymous, aggregated side: (domain, country) -> how
-- many DISTINCT users have blocked it. No user ids are ever stored here, and
-- freemail domains (gmail etc.) are never written at all (guarded in code).
-- Nothing reads it yet -- it accumulates evidence for a future global filter
-- ("graduation"), which will auto-dismiss into a visible Filtered section,
-- never silently drop.

create table if not exists blocked_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pattern text not null check (char_length(pattern) between 3 and 200),
  created_at timestamptz not null default now(),
  unique (user_id, pattern)
);

create index if not exists blocked_senders_user_idx on blocked_senders(user_id);

alter table blocked_senders enable row level security;

drop policy if exists "blocked_senders_select" on blocked_senders;
create policy "blocked_senders_select" on blocked_senders
  for select using (auth.uid() = user_id);

drop policy if exists "blocked_senders_insert" on blocked_senders;
create policy "blocked_senders_insert" on blocked_senders
  for insert with check (auth.uid() = user_id);

drop policy if exists "blocked_senders_update" on blocked_senders;
create policy "blocked_senders_update" on blocked_senders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "blocked_senders_delete" on blocked_senders;
create policy "blocked_senders_delete" on blocked_senders
  for delete using (auth.uid() = user_id);

-- Anonymous global aggregate. RLS enabled with NO policies: anon and
-- authenticated users can neither read nor write; only the service role
-- (which bypasses RLS) touches it, from the blockSender/unblockSender actions.
create table if not exists sender_signals (
  domain text not null check (char_length(domain) between 3 and 200),
  country text not null default '' check (char_length(country) <= 2),
  block_count integer not null default 0 check (block_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (domain, country)
);

alter table sender_signals enable row level security;
