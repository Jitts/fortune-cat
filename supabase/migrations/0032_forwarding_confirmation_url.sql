-- Store Google's one-click verification link alongside the code.
--
-- 0031 assumed the confirmation would always yield a numeric code. It doesn't:
-- Google used to put "(#123456789)" in the subject and has stopped, so the
-- code arrives only in body prose whose wording we don't control. Every
-- extraction rule for it is a guess about phrasing that can change again
-- without notice — and did, silently, which is how the first live setup got
-- stuck with Gmail waiting on a verification nothing could satisfy.
--
-- The link is structural rather than linguistic, so it survives rewording, and
-- it is the better interaction anyway: one click instead of copying nine
-- digits between two screens. The code stays as a fallback for the case where
-- the link is missing but a number is readable.
alter table email_forwarding_tokens
  add column if not exists pending_confirmation_url text;
