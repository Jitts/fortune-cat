-- Multiple email inboxes per user (a Pro perk — free stays at one; the app
-- enforces the per-tier cap in code). The original schema pinned one connection
-- per user with a UNIQUE on user_id; relax that to a UNIQUE on (user_id, email)
-- so a user can connect several distinct inboxes but never the same one twice.
--
-- RLS is unchanged: every email_connections policy already scopes by
-- auth.uid() = user_id and evaluates row-by-row, so it covers many rows per
-- user without modification.
--
-- Idempotent so it is safe to re-run from the Supabase SQL editor.

do $$
begin
  -- Drop the one-inbox-per-user rule (inline `user_id ... unique` in 0005 is
  -- named email_connections_user_id_key by Postgres convention).
  alter table email_connections drop constraint if exists email_connections_user_id_key;

  -- Prevent the same inbox being connected twice; add only if not already there.
  if not exists (
    select 1 from pg_constraint where conname = 'email_connections_user_email_key'
  ) then
    alter table email_connections
      add constraint email_connections_user_email_key unique (user_id, email);
  end if;
end $$;
