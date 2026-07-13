-- Backlog #2: move the auth brute-force throttle off audit_logs onto a
-- dedicated table, so the audit log stays purely semantic and throttle rows
-- get a TTL (audit_logs never pruned them). Enforcement runs only via the
-- service-role client inside server actions (see lib/rateLimit.ts).

create table if not exists rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_bucket_time
  on rate_limit_events (bucket, created_at desc);

-- RLS on with NO policies: invisible to anon/authenticated. The service role
-- bypasses RLS, so trusted server code can still read/write it.
alter table rate_limit_events enable row level security;

-- Records one hit for `p_bucket` and returns whether it is now over `p_limit`
-- within `p_window_seconds`. Semantics match the previous audit_logs limiter:
-- when already at/over the limit it does NOT record a further hit (bounded
-- growth), otherwise it records and allows. Opportunistically prunes rows well
-- outside the window so the table self-cleans.
create or replace function check_rate_limit(
  p_bucket text,
  p_limit int,
  p_window_seconds int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from rate_limit_events
    where created_at < now() - make_interval(secs => greatest(p_window_seconds * 4, 3600));

  select count(*) into v_count
    from rate_limit_events
    where bucket = p_bucket
      and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return jsonb_build_object('limited', true, 'count', v_count);
  end if;

  insert into rate_limit_events (bucket) values (p_bucket);
  return jsonb_build_object('limited', false, 'count', v_count + 1);
end;
$$;

-- Callable only by trusted server code, never by anon/authenticated.
revoke all on function check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function check_rate_limit(text, int, int) to service_role;
