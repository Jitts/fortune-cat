-- Close a paywall bypass: the v1 insert policy let a signed-in user insert a
-- payments row with ANY status — including 'active', which is what isPro
-- checks — so a user could self-grant Pro from the API. Users may only ever
-- create 'pending' rows (the normal checkout flow); 'active' is written solely
-- by the service role (Stripe webhook, and the free-beta grant), which
-- bypasses RLS.

drop policy if exists "payments_owner_insert" on payments;
create policy "payments_owner_insert" on payments
  for insert with check (auth.uid() = user_id and status = 'pending');
