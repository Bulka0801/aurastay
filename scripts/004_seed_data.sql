-- Insert room types
INSERT INTO public.room_types (name, description, max_occupancy, base_price, amenities) VALUES
('Standard Room', 'Comfortable room with essential amenities', 2, 120.00, '{"wifi": true, "tv": true, "minibar": false, "balcony": false}'),
('Deluxe Room', 'Spacious room with premium amenities', 2, 180.00, '{"wifi": true, "tv": true, "minibar": true, "balcony": true, "coffee_maker": true}'),
('Suite', 'Luxurious suite with separate living area', 4, 350.00, '{"wifi": true, "tv": true, "minibar": true, "balcony": true, "coffee_maker": true, "jacuzzi": true, "kitchen": true}'),
('Family Room', 'Large room perfect for families', 4, 220.00, '{"wifi": true, "tv": true, "minibar": true, "balcony": false, "coffee_maker": true}');

-- Insert rooms
INSERT INTO public.rooms (room_number, room_type_id, floor, status) 
SELECT 
  '1' || LPAD(i::TEXT, 2, '0') as room_number,
  (SELECT id FROM public.room_types WHERE name = 'Standard Room' LIMIT 1),
  1,
  'available'
FROM generate_series(1, 10) i;

INSERT INTO public.rooms (room_number, room_type_id, floor, status) 
SELECT 
  '2' || LPAD(i::TEXT, 2, '0') as room_number,
  (SELECT id FROM public.room_types WHERE name = 'Deluxe Room' LIMIT 1),
  2,
  'available'
FROM generate_series(1, 10) i;

INSERT INTO public.rooms (room_number, room_type_id, floor, status) 
SELECT 
  '3' || LPAD(i::TEXT, 2, '0') as room_number,
  (SELECT id FROM public.room_types WHERE name = 'Suite' LIMIT 1),
  3,
  'available'
FROM generate_series(1, 5) i;

INSERT INTO public.rooms (room_number, room_type_id, floor, status) 
SELECT 
  '3' || LPAD((i + 5)::TEXT, 2, '0') as room_number,
  (SELECT id FROM public.room_types WHERE name = 'Family Room' LIMIT 1),
  3,
  'available'
FROM generate_series(1, 5) i;

-- Insert rate plans
INSERT INTO public.rate_plans (name, description, rate_type, discount_percentage, valid_from, valid_to) VALUES
('Best Available Rate (BAR)', 'Standard flexible rate', 'BAR', 0, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year'),
('Early Bird Special', 'Book 30 days in advance and save 15%', 'Promotional', 15, CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months'),
('Corporate Rate', 'Special rate for corporate clients', 'Corporate', 20, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year'),
('Weekend Getaway', 'Special weekend rate', 'Promotional', 10, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months');
