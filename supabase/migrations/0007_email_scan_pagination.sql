-- Tracks how far back into the mailbox a scan has already reached (IMAP
-- sequence number), so "Scan older emails" can fetch the next batch further
-- back instead of only ever re-scanning the most recent 50 messages.
alter table email_connections
  add column if not exists oldest_scanned_seq integer;
