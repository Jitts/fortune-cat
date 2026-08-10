-- Seed sender_rules from trusted_senders.
--
-- 0027 carried existing BLOCKS across as opened = false, but left opened = true
-- empty. Since no row means "not opened" (see 0027's header), shipping the
-- envelope-first scan on top of that state would stop capture dead for every
-- existing user: nothing would be readable until they re-approved each sender
-- from scratch, and their ledger would quietly go silent.
--
-- A trusted sender is an unambiguous signal. Telling the app "post captures
-- from dbs.com straight to my ledger" is not a decision anyone makes about a
-- sender they don't want opened, so these carry across as opened = true.
--
-- Marked source = 'user' rather than 'auto': the person really did choose
-- these senders, just through a different question. Calling it 'auto' would
-- make the UI credit us with a choice they made.
--
-- Idempotent, and does not overwrite an existing rule — a sender someone has
-- since set to opened = false stays closed even if it is still trusted, since
-- the more recent and more specific decision wins.

do $$
begin
  if to_regclass('public.trusted_senders') is not null then
    insert into sender_rules (user_id, pattern, opened, source)
    select user_id, pattern, true, 'user'
    from trusted_senders
    on conflict (user_id, pattern) do nothing;
  end if;
end
$$;
