-- Feature-request board with voting, so users can tell us what to build next
-- and we can see which requests are actually in demand.

create table if not exists feature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text,
  vote_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists feature_votes (
  id uuid primary key default gen_random_uuid(),
  feature_request_id uuid not null references feature_requests(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (feature_request_id, user_id)
);

create index if not exists feature_votes_request_idx on feature_votes(feature_request_id);

-- Keep vote_count in sync so the board can sort by it directly without a
-- join/aggregate on every read. Runs as the function owner, so it applies
-- regardless of the caller's RLS.
create or replace function feature_requests_sync_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update feature_requests set vote_count = vote_count + 1 where id = new.feature_request_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update feature_requests set vote_count = greatest(vote_count - 1, 0) where id = old.feature_request_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists feature_votes_sync_count on feature_votes;
create trigger feature_votes_sync_count
  after insert or delete on feature_votes
  for each row execute function feature_requests_sync_vote_count();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- This is a shared community board, not per-user private data: any signed-in
-- user can read every request/vote, but can only write rows attributed to
-- themselves.

alter table feature_requests enable row level security;
drop policy if exists "feature_requests_read" on feature_requests;
create policy "feature_requests_read" on feature_requests
  for select using (auth.uid() is not null);
drop policy if exists "feature_requests_insert" on feature_requests;
create policy "feature_requests_insert" on feature_requests
  for insert with check (auth.uid() = user_id);

alter table feature_votes enable row level security;
drop policy if exists "feature_votes_read" on feature_votes;
create policy "feature_votes_read" on feature_votes
  for select using (auth.uid() is not null);
drop policy if exists "feature_votes_insert" on feature_votes;
create policy "feature_votes_insert" on feature_votes
  for insert with check (auth.uid() = user_id);
drop policy if exists "feature_votes_delete" on feature_votes;
create policy "feature_votes_delete" on feature_votes
  for delete using (auth.uid() = user_id);

-- Seed with the roadmap items the PRD already named as v1 non-goals — this
-- polling feature exists precisely to validate demand for these.
insert into feature_requests (id, user_id, title, description, vote_count) values
  ('c1000000-0000-0000-0000-000000000001', null, 'Budget targets & savings goals', 'Set a monthly cap per category and see progress toward it.', 0),
  ('c1000000-0000-0000-0000-000000000002', null, 'Recurring-transaction detection', 'Auto-detect subscriptions and recurring bills so I don''t log them by hand every month.', 0),
  ('c1000000-0000-0000-0000-000000000003', null, 'CSV / PDF export', 'Export my transaction history for taxes or my own records.', 0),
  ('c1000000-0000-0000-0000-000000000004', null, 'Shared / family accounts', 'Track spending together with a partner or roommates.', 0),
  ('c1000000-0000-0000-0000-000000000005', null, 'Mobile app', 'A native app so I can log expenses on the go.', 0)
on conflict (id) do nothing;
