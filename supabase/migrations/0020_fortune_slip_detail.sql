-- The fortune slip's engine already computed a concrete "detail" observation
-- (nearest bill / burn pace) but it was never persisted or shown -- the slip
-- only ever displayed its headline, which is why it read as vague. This adds
-- storage for that line plus a new Pro-only actionable recommendation
-- ("Keep today under $X and the week closes ahead").

alter table fortune_slips add column if not exists detail text;
alter table fortune_slips add column if not exists recommendation text;
