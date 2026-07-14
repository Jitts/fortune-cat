-- OAuth (Microsoft) inboxes alongside IMAP ones. Adds an auth_type
-- discriminator and encrypted OAuth token columns, and relaxes the IMAP-only
-- NOT NULLs so an OAuth connection (no app password, no IMAP host) is valid.
--
-- Additive + idempotent — safe to run from the Supabase SQL editor. RLS is
-- unchanged: the existing owner policies evaluate row-by-row and already cover
-- the new columns, so the OAuth tokens are readable only by their owner.

alter table email_connections
  add column if not exists auth_type text not null default 'imap',
  add column if not exists oauth_access_token text,
  add column if not exists oauth_refresh_token text,
  add column if not exists oauth_token_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_connections_auth_type_chk'
  ) then
    alter table email_connections
      add constraint email_connections_auth_type_chk check (auth_type in ('imap', 'microsoft'));
  end if;
end $$;

-- OAuth connections have no app password or IMAP host.
alter table email_connections alter column encrypted_password drop not null;
alter table email_connections alter column imap_host drop not null;
