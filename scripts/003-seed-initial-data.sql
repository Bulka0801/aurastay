-- Seed initial data for Grand Oasis Hotel PMS

-- Insert default rate plans
INSERT INTO rate_plans (name, code, description, is_default, discount_percentage) VALUES
('Best Available Rate', 'BAR', 'Standard flexible rate with full cancellation policy', true, 0),
('Non-Refundable', 'NRF', 'Non-refundable rate with 15% discount', false, 15),
('Corporate Rate', 'CORP', 'Special rate for corporate clients', false, 10),
('Government Rate', 'GOV', 'Rate for government employees', false, 20),
('Weekend Special', 'WKND', 'Special weekend promotional rate', false, 25);

-- Insert room types
INSERT INTO room_types (name, code, description, base_occupancy, max_occupancy, base_rate, amenities, size_sqm, bed_type) VALUES
('Standard Room', 'STD', 'Comfortable standard room with modern amenities', 2, 3, 100.00, ARRAY['WiFi', 'TV', 'Mini Bar', 'Air Conditioning', 'Safe'], 25, 'Queen Bed'),
('Deluxe Room', 'DLX', 'Spacious deluxe room with city view', 2, 4, 150.00, ARRAY['WiFi', 'Smart TV', 'Mini Bar', 'Air Conditioning', 'Safe', 'Coffee Machine'], 35, 'King Bed'),
('Junior Suite', 'JST', 'Junior suite with separate living area', 2, 4, 200.00, ARRAY['WiFi', 'Smart TV', 'Mini Bar', 'Air Conditioning', 'Safe', 'Coffee Machine', 'Bathtub'], 45, 'King Bed'),
('Executive Suite', 'EXE', 'Luxurious executive suite with panoramic views', 2, 4, 300.00, ARRAY['WiFi', 'Smart TV', 'Mini Bar', 'Air Conditioning', 'Safe', 'Coffee Machine', 'Bathtub', 'Work Desk'], 60, 'King Bed'),
('Presidential Suite', 'PRS', 'Ultimate luxury presidential suite', 2, 6, 500.00, ARRAY['WiFi', 'Smart TV', 'Full Kitchen', 'Air Conditioning', 'Safe', 'Coffee Machine', 'Jacuzzi', 'Private Balcony'], 100, '2 King Beds');

-- Insert rooms (3 floors, 10 rooms per floor)
DO $$
DECLARE
  room_type_ids UUID[];
  floor_num INT;
  room_num INT;
  room_type_id UUID;
BEGIN
  -- Get room type IDs
  SELECT ARRAY_AGG(id) INTO room_type_ids FROM room_types;
  
  -- Create rooms
  FOR floor_num IN 1..3 LOOP
    FOR room_num IN 1..10 LOOP
      -- Distribute room types evenly
      room_type_id := room_type_ids[(room_num - 1) % array_length(room_type_ids, 1) + 1];
      
      INSERT INTO rooms (room_number, room_type_id, floor, status)
      VALUES (
        floor_num || LPAD(room_num::text, 2, '0'),
        room_type_id,
        floor_num,
        'available'
      );
    END LOOP;
  END LOOP;
END $$;

-- Insert additional hotel services
INSERT INTO services (name, code, category, price, description, tax_rate) VALUES
('Airport Transfer', 'AIRP', 'Transportation', 50.00, 'One-way airport transfer service', 10),
('Laundry Service', 'LNDR', 'Housekeeping', 25.00, 'Express laundry service per bag', 10),
('Room Service Breakfast', 'BKFST', 'Food & Beverage', 20.00, 'Continental breakfast in room', 10),
('Spa Treatment', 'SPA60', 'Wellness', 80.00, '60-minute spa treatment', 10),
('Late Checkout', 'LTCO', 'Front Desk', 30.00, 'Late checkout until 6 PM', 0),
('Extra Bed', 'XBED', 'Front Desk', 25.00, 'Additional bed in room', 10),
('Mini Bar Restock', 'MBAR', 'Housekeeping', 15.00, 'Mini bar restocking', 10),
('Meeting Room Rental', 'MEET', 'Business', 100.00, 'Meeting room rental per hour', 10);

-- Insert inventory items
INSERT INTO inventory_items (name, category, unit, current_stock, min_stock, max_stock, unit_cost, location) VALUES
('Bed Sheets - Queen', 'Linen', 'piece', 100, 30, 150, 15.00, 'Linen Storage - Floor 1'),
('Bed Sheets - King', 'Linen', 'piece', 100, 30, 150, 18.00, 'Linen Storage - Floor 1'),
('Pillowcases', 'Linen', 'piece', 200, 50, 250, 5.00, 'Linen Storage - Floor 1'),
('Bath Towels', 'Linen', 'piece', 150, 50, 200, 8.00, 'Linen Storage - Floor 1'),
('Hand Towels', 'Linen', 'piece', 150, 50, 200, 4.00, 'Linen Storage - Floor 1'),
('Shampoo Bottles', 'Amenities', 'piece', 500, 100, 600, 2.00, 'Housekeeping Storage'),
('Conditioner Bottles', 'Amenities', 'piece', 500, 100, 600, 2.00, 'Housekeeping Storage'),
('Body Wash', 'Amenities', 'piece', 500, 100, 600, 2.50, 'Housekeeping Storage'),
('Soap Bars', 'Amenities', 'piece', 800, 150, 1000, 1.00, 'Housekeeping Storage'),
('Toilet Paper', 'Amenities', 'roll', 1000, 200, 1500, 0.50, 'Housekeeping Storage'),
('Cleaning Solution', 'Cleaning', 'bottle', 50, 20, 80, 8.00, 'Housekeeping Storage'),
('Disinfectant', 'Cleaning', 'bottle', 50, 20, 80, 10.00, 'Housekeeping Storage'),
('Vacuum Bags', 'Equipment', 'piece', 30, 10, 50, 5.00, 'Maintenance Storage'),
('Light Bulbs - LED', 'Maintenance', 'piece', 100, 30, 150, 3.00, 'Maintenance Storage'),
('Batteries - AA', 'Maintenance', 'pack', 50, 15, 80, 4.00, 'Maintenance Storage');

-- Insert a default admin user (password: Admin123!)
-- Note: In production, this should be changed immediately
INSERT INTO users (employee_id, email, password_hash, first_name, last_name, role, department, position, is_active)
VALUES (
  'EMP001',
  'admin@grandoasis.com',
  '$2a$10$rKvVfVQvPvPvN3qY4qGz4uKlHkDqTqBvNvNvNvNvNvNvNvNvNvNv.',
  'System',
  'Administrator',
  'system_administrator',
  'IT',
  'System Administrator',
  true
);

-- Note: The password hash above is a placeholder. 
-- The actual implementation will use proper bcrypt hashing in the application layer.
