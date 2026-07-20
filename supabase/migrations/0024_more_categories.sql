insert into categories (id, name, icon) values
  ('a1000000-0000-0000-0000-000000000008', 'Housing', '🏠'),
  ('a1000000-0000-0000-0000-000000000009', 'Groceries', '🛒'),
  ('a1000000-0000-0000-0000-000000000010', 'Insurance', '🛡️'),
  ('a1000000-0000-0000-0000-000000000011', 'Gifts & Donations', '🎁'),
  ('a1000000-0000-0000-0000-000000000012', 'Online Shopping', '📦'),
  ('a1000000-0000-0000-0000-000000000013', 'Education', '🎓')
on conflict (id) do nothing;
