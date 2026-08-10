-- Sender scoping: which senders a scan is allowed to OPEN.
--
-- Until now a scan downloaded the full source of every recent message and read
-- all of them to decide which were transactions. That is a much larger ask than
-- the product was describing, and beta testers refused the app-password screen
-- over it. From here a scan reads envelopes first (sender, subject, date) and
-- only fetches bodies for senders with an `opened = true` rule.
--
-- THE IMPORTANT SEMANTIC: no row means UNDECIDED, which means NOT opened.
-- Absence is not consent. An undecided sender surfaces in Review as "we saw
-- mail from x, may we open it?" and only becomes readable once a row exists.
-- Anyone adding a code path that treats a missing row as permission has
-- reintroduced the bug this table exists to fix.
--
-- This also absorbs blocked_senders: a sender you never open IS a blocked
-- sender, so "blocked" stops being a separate concept and becomes
-- `opened = false`. Existing blocks are carried over below. blocked_senders is
-- deliberately NOT dropped here — the running deploy still reads it, so it is
-- retired in a later migration once nothing references it.
--
-- trusted_senders stays separate on purpose. It answers a different question:
-- not "may we open this" but "may a capture from it post without review".

create table if not exists sender_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Matched as a substring of the whole From address, so both a domain
  -- ("spotify.com") and a single address ("billing@spotify.com") are valid.
  -- The UI writes domains by default; per-address rules are a refinement.
  pattern text not null check (char_length(pattern) between 3 and 200),
  -- false = never open this sender's mail (what blocked_senders meant).
  opened boolean not null default true,
  -- 'user'  — the person chose this explicitly.
  -- 'auto'  — recognised as a likely bank on first scan, so the first scan
  --           isn't empty. Shown as such in the UI; never claimed as a choice
  --           the user made.
  source text not null default 'user' check (source in ('user', 'auto')),
  created_at timestamptz not null default now(),
  unique (user_id, pattern)
);

create index if not exists sender_rules_user_idx on sender_rules(user_id);

alter table sender_rules enable row level security;

drop policy if exists "sender_rules_select" on sender_rules;
create policy "sender_rules_select" on sender_rules
  for select using (auth.uid() = user_id);

drop policy if exists "sender_rules_insert" on sender_rules;
create policy "sender_rules_insert" on sender_rules
  for insert with check (auth.uid() = user_id);

drop policy if exists "sender_rules_update" on sender_rules;
create policy "sender_rules_update" on sender_rules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sender_rules_delete" on sender_rules;
create policy "sender_rules_delete" on sender_rules
  for delete using (auth.uid() = user_id);

-- Carry every existing block across as "never open". Guarded so this migration
-- still applies cleanly on a database where 0022 was never run, and idempotent
-- so re-running it is harmless.
do $$
begin
  if to_regclass('public.blocked_senders') is not null then
    insert into sender_rules (user_id, pattern, opened, source)
    select user_id, pattern, false, 'user'
    from blocked_senders
    on conflict (user_id, pattern) do nothing;
  end if;
end
$$;
