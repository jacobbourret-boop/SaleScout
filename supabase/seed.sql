-- Optional beta seed data. Safe to run more than once.
insert into public.sales (
  id, owner_id, type, title, description, address, cross_streets, latitude, longitude,
  categories, highlights, hours, base_status, photo_url, creator_name, ends_at, created_at, updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111', null, 'garage', 'Tools, bikes, and patio gear',
    'Two-driveway sale with hand tools, a bench vise, kids bikes, planters, and folding chairs.',
    '1200 block of Maple Street', 'Maple Street and 12th', 41.5961, -93.6422,
    array['Tools','Kids','Garden'], array['hand tools','kids bikes','patio chairs'],
    'Today 8 AM - 3 PM', 'open', '/assets/sales/tools-bikes.webp', 'Maya', now() + interval '30 hours', now() - interval '2 hours', now() - interval '25 minutes'
  ),
  (
    '22222222-2222-4222-8222-222222222222', null, 'estate', 'Estate sale with furniture and vinyl',
    'Clean furniture, records, lamps, framed art, kitchenware, and a packed garage table.',
    '800 block of Oak Park Avenue', 'Oak Park Avenue and 9th', 41.5777, -93.6117,
    array['Furniture','Collectibles','Kitchen'], array['vinyl records','lamps','solid wood dresser'],
    'Today 9 AM - 4 PM', 'open', '/assets/sales/estate-vinyl.webp', 'Andre', now() + interval '32 hours', now() - interval '3 hours', now() - interval '40 minutes'
  ),
  (
    '33333333-3333-4333-8333-333333333333', null, 'yard', 'Kids clothes and outdoor toys',
    'Front-yard tables with toddler clothes, scooters, books, puzzles, and a few baby gates.',
    '2600 block of Forest Avenue', 'Forest Avenue and 26th', 41.6043, -93.6526,
    array['Kids','Clothes','Books'], array['scooters','board books','baby gates'],
    'Today 7:30 AM - 1 PM', 'questionable', '/assets/sales/kids-yard.webp', 'Priya', now() + interval '28 hours', now() - interval '90 minutes', now() - interval '15 minutes'
  )
on conflict (id) do update set
  ends_at = excluded.ends_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

insert into public.sale_feedback (id, sale_id, reporter_id, type, note, profile_name, created_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', null, 'comment', 'Seller is still unpacking boxes.', 'Maya', now() - interval '25 minutes'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', null, 'comment', 'Line moved fast and prices are marked.', 'Andre', now() - interval '40 minutes'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '33333333-3333-4333-8333-333333333333', null, 'comment', 'Lots of kids sizes under 6T.', 'Priya', now() - interval '15 minutes')
on conflict (id) do update set created_at = excluded.created_at;
