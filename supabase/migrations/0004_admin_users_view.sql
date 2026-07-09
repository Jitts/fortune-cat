-- Admin-only overview of signed-up users, for browsing in Supabase Studio
-- (Table Editor / SQL Editor) as the project owner. Not exposed to the app's
-- client-side API: anon/authenticated have no grant on it, so it can't be
-- queried through PostgREST/supabase-js — only the postgres/service_role
-- connection Studio uses can see it.

create or replace view public.admin_user_overview as
select
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  u.last_sign_in_at,
  coalesce(p.is_pro, false) as is_pro
from auth.users u
left join (
  select user_id, true as is_pro
  from payments
  where status = 'active'
) p on p.user_id = u.id
order by u.created_at desc;

revoke all on public.admin_user_overview from anon, authenticated, public;
