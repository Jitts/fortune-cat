insert into categories (id, name, icon) values
  ('a1000000-0000-0000-0000-000000000007', 'Travel', '🏨')
on conflict (id) do nothing;
