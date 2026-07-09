-- Sprint 3 — Lock it down: replace open v1 policies with per-user RLS.
-- Server actions run as the signed-in user (cookie session), so auth.uid()
-- scopes every row. The Stripe webhook uses the service-role key, which
-- bypasses RLS entirely, so no public write policy is needed for it.

-- ── transactions ──────────────────────────────────────────────────────────────
drop policy if exists "transactions_v1_read" on transactions;
drop policy if exists "transactions_v1_write" on transactions;

create policy "transactions_owner_select" on transactions
  for select using (auth.uid() = user_id);
create policy "transactions_owner_insert" on transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_owner_update" on transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_owner_delete" on transactions
  for delete using (auth.uid() = user_id);

-- ── payments ──────────────────────────────────────────────────────────────────
drop policy if exists "payments_v1_read" on payments;
drop policy if exists "payments_v1_write" on payments;

create policy "payments_owner_select" on payments
  for select using (auth.uid() = user_id);
create policy "payments_owner_insert" on payments
  for insert with check (auth.uid() = user_id);
-- status transitions (pending -> active) happen only in the webhook via the
-- service-role key, which is exempt from RLS. No owner update/delete policy.

-- ── audit_logs (append-only) ──────────────────────────────────────────────────
drop policy if exists "audit_logs_v1_read" on audit_logs;
drop policy if exists "audit_logs_v1_write" on audit_logs;

create policy "audit_logs_owner_select" on audit_logs
  for select using (auth.uid() = user_id);
create policy "audit_logs_owner_insert" on audit_logs
  for insert with check (auth.uid() = user_id);
-- no update/delete policy: logs are immutable for regular users.

-- ── categories ────────────────────────────────────────────────────────────────
-- System categories (user_id is null) stay readable by everyone signed in so
-- the dropdown works; users can also read their own. No public write.
drop policy if exists "categories_v1_read" on categories;
drop policy if exists "categories_v1_write" on categories;

create policy "categories_read" on categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories_owner_insert" on categories
  for insert with check (auth.uid() = user_id);
