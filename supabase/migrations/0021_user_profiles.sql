-- user_profiles: per-user locale + currency settings for international support.
-- One row per user (user_id is the primary key, so one profile per user is
-- enforced by the DB). A MISSING row is a valid state and means the app falls
-- back to its Singapore defaults (SGD / en-SG / Asia-Singapore) -- so existing
-- users, and the gap between this migration and a user finishing onboarding,
-- both degrade gracefully with no backfill required.

create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country text check (country is null or char_length(country) = 2),        -- ISO 3166-1 alpha-2 (SG, MY, GB)
  base_currency text check (base_currency is null or char_length(base_currency) = 3), -- ISO 4217 (SGD, MYR, GBP)
  locale text,        -- BCP-47 (en-SG, en-GB)
  timezone text,      -- IANA tz (Asia/Singapore)
  onboarded_at timestamptz,   -- when the country/currency step was completed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- Owner-only: a user can only ever see or change their own profile row.
drop policy if exists "user_profiles_select" on user_profiles;
create policy "user_profiles_select" on user_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "user_profiles_insert" on user_profiles;
create policy "user_profiles_insert" on user_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update" on user_profiles;
create policy "user_profiles_update" on user_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_profiles_delete" on user_profiles;
create policy "user_profiles_delete" on user_profiles
  for delete using (auth.uid() = user_id);
