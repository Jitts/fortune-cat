-- Backlog #61/#62: lets the two anonymous aggregates started in 0022 actually
-- do something.
--
-- 1. A new 'filtered' status for email_transaction_candidates: when a domain
--    has been independently blocked by enough distinct users (see
--    GRADUATION_THRESHOLD in lib/email/senderSignals.ts), new captures from it
--    land here instead of 'pending' -- visible in its own Filtered section
--    with one-tap undo, never silently dropped. Distinct from 'dismissed'
--    (a user's own choice) so the two never get confused in the UI.
--
-- 2. trust_signals: the mirror of sender_signals for the reverse signal --
--    (domain, country) -> how many distinct users have TRUSTED it. Same
--    anonymous shape, same no-policy RLS (service role only), same freemail
--    exclusion (guarded in code). Nothing consumes it yet; it accumulates
--    evidence for regional bank/merchant recognition once there's real
--    per-country signal to bootstrap from.

alter table email_transaction_candidates drop constraint if exists email_transaction_candidates_status_check;
alter table email_transaction_candidates add constraint email_transaction_candidates_status_check
  check (status in ('pending', 'accepted', 'dismissed', 'filtered'));

create table if not exists trust_signals (
  domain text not null check (char_length(domain) between 3 and 200),
  country text not null default '' check (char_length(country) <= 2),
  trust_count integer not null default 0 check (trust_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (domain, country)
);

alter table trust_signals enable row level security;
