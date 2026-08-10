-- Reconcile blocked_senders into sender_rules.
--
-- 0027 carried existing blocks across as `opened = false`, but blockSender kept
-- writing ONLY to blocked_senders after that. Any sender blocked between 0027
-- and this deploy therefore has no rule, and the envelope pass consults rules —
-- so the block was cosmetic: the message was still downloaded and read, then
-- discarded after parsing. For a sender that had been trusted it was worse, as
-- its rule still said `opened = true`.
--
-- The code fix (blockSender now writes both) stops new divergence. This closes
-- the window that already opened.
--
-- Same statement as 0027's backfill, deliberately. `do nothing` matters: a
-- sender blocked long ago and since re-approved through the Review prompt has
-- `opened = true`, and that later decision must survive this. An upsert here
-- would silently revoke it.

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
