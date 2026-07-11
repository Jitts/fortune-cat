-- Flow phase 3: SMS forwarding. A per-user webhook token lets a phone
-- shortcut forward bank SMS to /api/inbound/sms. The token is the only
-- credential — owner-only visible, regenerable, and deleting the row turns
-- the channel off.
create table if not exists sms_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  token text not null unique,
  last_received_at timestamptz,
  created_at timestamptz not null default now()
);

alter table sms_tokens enable row level security;
drop policy if exists "sms_tokens_owner_select" on sms_tokens;
create policy "sms_tokens_owner_select" on sms_tokens
  for select using (auth.uid() = user_id);
drop policy if exists "sms_tokens_owner_insert" on sms_tokens;
create policy "sms_tokens_owner_insert" on sms_tokens
  for insert with check (auth.uid() = user_id);
drop policy if exists "sms_tokens_owner_update" on sms_tokens;
create policy "sms_tokens_owner_update" on sms_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sms_tokens_owner_delete" on sms_tokens;
create policy "sms_tokens_owner_delete" on sms_tokens
  for delete using (auth.uid() = user_id);
