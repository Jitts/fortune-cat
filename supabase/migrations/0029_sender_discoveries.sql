-- What the envelope pass SAW, as opposed to what the user DECIDED.
--
-- sender_rules answers "may we open this sender". This answers "who has been
-- writing to you that we haven't opened", which is what the Review prompt
-- needs in order to ask. The two are deliberately separate: a decision is
-- permanent until changed, a discovery is a rolling observation that gets
-- refreshed on every scan.
--
-- Nothing here comes from a message BODY. The envelope pass retrieves sender,
-- subject and date only, so a discovery row can be created for a sender whose
-- mail has never been opened — which is the entire point. `sample_subject` is
-- a subject line, never body text.
--
-- Rows are kept after a decision is made rather than deleted, so the Capture
-- screen can show "18 other senders skipped this scan" without re-scanning,
-- and so a user can revisit a sender they said no to.

create table if not exists sender_discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Domain, matching sender_rules.pattern so the two join on equal terms.
  pattern text not null check (char_length(pattern) between 3 and 200),
  -- Full addresses seen behind that domain, e.g. {billing@spotify.com,
  -- marketing@spotify.com}. Lets the prompt show what a domain-level decision
  -- actually covers, and lets someone narrow to one address if they want to.
  addresses text[] not null default '{}',
  message_count integer not null default 0 check (message_count >= 0),
  -- Most recent subject line, for recognising the sender at a glance.
  sample_subject text,
  -- Did the subject look like a receipt? Cheap heuristic over the envelope,
  -- used to sort the prompt so likely banks surface first. Never a reason to
  -- open anything on its own.
  looks_transactional boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, pattern)
);

create index if not exists sender_discoveries_user_idx on sender_discoveries(user_id);

alter table sender_discoveries enable row level security;

drop policy if exists "sender_discoveries_select" on sender_discoveries;
create policy "sender_discoveries_select" on sender_discoveries
  for select using (auth.uid() = user_id);

drop policy if exists "sender_discoveries_insert" on sender_discoveries;
create policy "sender_discoveries_insert" on sender_discoveries
  for insert with check (auth.uid() = user_id);

drop policy if exists "sender_discoveries_update" on sender_discoveries;
create policy "sender_discoveries_update" on sender_discoveries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sender_discoveries_delete" on sender_discoveries;
create policy "sender_discoveries_delete" on sender_discoveries
  for delete using (auth.uid() = user_id);
