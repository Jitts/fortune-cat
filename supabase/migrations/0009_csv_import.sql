-- Flow phase 2: bank-statement CSV backfill.
-- Candidates now record which channel captured them ('email' | 'csv') so the
-- review tray can label provenance and future channels (SMS) slot in cleanly.
alter table email_transaction_candidates
  add column if not exists source text not null default 'email';
