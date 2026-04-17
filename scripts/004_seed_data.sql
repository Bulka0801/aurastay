-- =====================================================
-- AuraStay HMS - Seed Data (Ukrainian)
-- Початкові дані українською мовою
-- =====================================================

-- =====================================================
-- SYSTEM SETTINGS / НАЛАШТУВАННЯ СИСТЕМИ
-- =====================================================

INSERT INTO public.settings (key, value, description) VALUES
  ('hotel_name', '"AuraStay Hotel"', 'Назва готелю'),
  ('hotel_address', '"вул. Хрещатик, 1, Київ, 01001"', 'Адреса готелю'),
  ('hotel_phone', '"+380 44 123 45 67"', 'Телефон готелю'),
  ('hotel_email', '"info@aurastay.ua"', 'Email готелю'),
  ('check_in_time', '"14:00"', 'Час заїзду'),
  ('check_out_time', '"12:00"', 'Час виїзду'),
  ('currency', '"UAH"', 'Валюта'),
  ('timezone', '"Europe/Kyiv"', 'Часовий пояс'),
  ('tax_rate', '20', 'Ставка ПДВ (%)'),
  ('late_checkout_fee', '500', 'Плата за пізній виїзд (грн)')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- FLOORS / ПОВЕРХИ
-- =====================================================

INSERT INTO public.floors (number, name) VALUES
  (1, 'Перший поверх'),
  (2, 'Другий поверх'),
  (3, 'Третій поверх'),
  (4, 'Четвертий поверх'),
  (5, 'П''ятий поверх')
ON CONFLICT (number) DO NOTHING;

-- =====================================================
-- ROOM TYPES / ТИПИ НОМЕРІВ
-- =====================================================

INSERT INTO public.room_types (name, name_uk, description, description_uk, base_price, max_occupancy, amenities) VALUES
  (
    'Standard Single',
    'Стандарт одномісний',
    'Cozy single room with all essential amenities',
    'Затишний одномісний номер з усіма необхідними зручностями. Ідеально підходить для ділових подорожей.',
    1500.00,
    1,
    '["wifi", "tv", "air_conditioning", "mini_fridge", "safe"]'::jsonb
  ),
  (
    'Standard Double',
    'Стандарт двомісний',
    'Comfortable double room with queen-size bed',
    'Комфортний двомісний номер з двоспальним ліжком. Підходить для пар або одиноких мандрівників.',
    2200.00,
    2,
    '["wifi", "tv", "air_conditioning", "mini_fridge", "safe", "kettle"]'::jsonb
  ),
  (
    'Standard Twin',
    'Стандарт твін',
    'Room with two separate single beds',
    'Номер з двома окремими односпальними ліжками. Ідеально для друзів або колег.',
    2200.00,
    2,
    '["wifi", "tv", "air_conditioning", "mini_fridge", "safe", "kettle"]'::jsonb
  ),
  (
    'Superior',
    'Суперіор',
    'Spacious room with enhanced amenities',
    'Просторий номер з покращеними зручностями та видом на місто.',
    3200.00,
    2,
    '["wifi", "tv", "air_conditioning", "mini_fridge", "safe", "kettle", "bathrobe", "slippers"]'::jsonb
  ),
  (
    'Junior Suite',
    'Джуніор Сюіт',
    'Suite with separate living area',
    'Напівлюкс з окремою вітальнею зоною та підвищеним рівнем комфорту.',
    4500.00,
    3,
    '["wifi", "tv", "air_conditioning", "mini_bar", "safe", "kettle", "bathrobe", "slippers", "coffee_machine"]'::jsonb
  ),
  (
    'Suite',
    'Люкс',
    'Luxurious suite with premium amenities',
    'Розкішний люкс з окремою спальнею, вітальнею та преміум зручностями.',
    6500.00,
    4,
    '["wifi", "tv", "air_conditioning", "mini_bar", "safe", "kettle", "bathrobe", "slippers", "coffee_machine", "jacuzzi"]'::jsonb
  ),
  (
    'Family Room',
    'Сімейний номер',
    'Large room ideal for families with children',
    'Великий номер, ідеальний для сімей з дітьми. Має додаткове спальне місце.',
    3800.00,
    4,
    '["wifi", "tv", "air_conditioning", "mini_fridge", "safe", "kettle", "crib_available"]'::jsonb
  ),
  (
    'Accessible Room',
    'Номер для людей з інвалідністю',
    'Fully accessible room with special amenities',
    'Повністю доступний номер зі спеціальними зручностями для людей з обмеженими можливостями.',
    2000.00,
    2,
    '["wifi", "tv", "air_conditioning", "mini_fridge", "safe", "wheelchair_accessible", "grab_bars", "roll_in_shower"]'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- AMENITIES / ЗРУЧНОСТІ
-- =====================================================

INSERT INTO public.amenities (name, name_uk, icon, category) VALUES
  ('wifi', 'Безкоштовний Wi-Fi', 'wifi', 'connectivity'),
  ('tv', 'Телевізор', 'tv', 'entertainment'),
  ('air_conditioning', 'Кондиціонер', 'thermometer', 'climate'),
  ('mini_fridge', 'Міні-холодильник', 'refrigerator', 'amenities'),
  ('mini_bar', 'Міні-бар', 'wine', 'amenities'),
  ('safe', 'Сейф', 'lock', 'security'),
  ('kettle', 'Електрочайник', 'coffee', 'amenities'),
  ('coffee_machine', 'Кавомашина', 'coffee', 'amenities'),
  ('bathrobe', 'Халат', 'shirt', 'bathroom'),
  ('slippers', 'Тапочки', 'footprints', 'bathroom'),
  ('hair_dryer', 'Фен', 'wind', 'bathroom'),
  ('jacuzzi', 'Джакузі', 'bath', 'bathroom'),
  ('balcony', 'Балкон', 'door-open', 'room'),
  ('city_view', 'Вид на місто', 'building', 'room'),
  ('work_desk', 'Робочий стіл', 'desk', 'business'),
  ('iron', 'Праска', 'iron', 'amenities'),
  ('crib_available', 'Дитяче ліжечко', 'baby', 'family'),
  ('wheelchair_accessible', 'Доступ для інвалідних візків', 'accessibility', 'accessibility'),
  ('grab_bars', 'Поручні безпеки', 'grip', 'accessibility'),
  ('roll_in_shower', 'Душ без порога', 'shower', 'accessibility'),
  ('parking', 'Парковка', 'car', 'services'),
  ('breakfast_included', 'Сніданок включено', 'utensils', 'services'),
  ('room_service', 'Обслуговування номерів', 'bell', 'services'),
  ('laundry', 'Пральня', 'washing-machine', 'services'),
  ('gym_access', 'Доступ до спортзалу', 'dumbbell', 'wellness'),
  ('spa_access', 'Доступ до СПА', 'spa', 'wellness'),
  ('pool_access', 'Доступ до басейну', 'pool', 'wellness')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ROOMS / НОМЕРИ
-- =====================================================

-- Отримуємо ID типів номерів та поверхів для вставки
DO $$
DECLARE
  floor_1 UUID;
  floor_2 UUID;
  floor_3 UUID;
  floor_4 UUID;
  floor_5 UUID;
  type_standard_single UUID;
  type_standard_double UUID;
  type_standard_twin UUID;
  type_superior UUID;
  type_junior_suite UUID;
  type_suite UUID;
  type_family UUID;
  type_accessible UUID;
BEGIN
  -- Отримуємо ID поверхів
  SELECT id INTO floor_1 FROM public.floors WHERE number = 1;
  SELECT id INTO floor_2 FROM public.floors WHERE number = 2;
  SELECT id INTO floor_3 FROM public.floors WHERE number = 3;
  SELECT id INTO floor_4 FROM public.floors WHERE number = 4;
  SELECT id INTO floor_5 FROM public.floors WHERE number = 5;
  
  -- Отримуємо ID типів номерів
  SELECT id INTO type_standard_single FROM public.room_types WHERE name = 'Standard Single';
  SELECT id INTO type_standard_double FROM public.room_types WHERE name = 'Standard Double';
  SELECT id INTO type_standard_twin FROM public.room_types WHERE name = 'Standard Twin';
  SELECT id INTO type_superior FROM public.room_types WHERE name = 'Superior';
  SELECT id INTO type_junior_suite FROM public.room_types WHERE name = 'Junior Suite';
  SELECT id INTO type_suite FROM public.room_types WHERE name = 'Suite';
  SELECT id INTO type_family FROM public.room_types WHERE name = 'Family Room';
  SELECT id INTO type_accessible FROM public.room_types WHERE name = 'Accessible Room';

  -- Перший поверх - доступні номери та стандартні
  INSERT INTO public.rooms (room_number, room_type_id, floor_id, status) VALUES
    ('101', type_accessible, floor_1, 'available'),
    ('102', type_accessible, floor_1, 'available'),
    ('103', type_standard_single, floor_1, 'available'),
    ('104', type_standard_single, floor_1, 'available'),
    ('105', type_standard_double, floor_1, 'available'),
    ('106', type_standard_double, floor_1, 'available')
  ON CONFLICT (room_number) DO NOTHING;

  -- Другий поверх - стандартні номери
  INSERT INTO public.rooms (room_number, room_type_id, floor_id, status) VALUES
    ('201', type_standard_single, floor_2, 'available'),
    ('202', type_standard_single, floor_2, 'available'),
    ('203', type_standard_double, floor_2, 'available'),
    ('204', type_standard_double, floor_2, 'available'),
    ('205', type_standard_twin, floor_2, 'available'),
    ('206', type_standard_twin, floor_2, 'available'),
    ('207', type_family, floor_2, 'available'),
    ('208', type_family, floor_2, 'available')
  ON CONFLICT (room_number) DO NOTHING;

  -- Третій поверх - суперіор та сімейні
  INSERT INTO public.rooms (room_number, room_type_id, floor_id, status) VALUES
    ('301', type_superior, floor_3, 'available'),
    ('302', type_superior, floor_3, 'available'),
    ('303', type_superior, floor_3, 'available'),
    ('304', type_superior, floor_3, 'available'),
    ('305', type_family, floor_3, 'available'),
    ('306', type_family, floor_3, 'available')
  ON CONFLICT (room_number) DO NOTHING;

  -- Четвертий поверх - джуніор сюіти
  INSERT INTO public.rooms (room_number, room_type_id, floor_id, status) VALUES
    ('401', type_junior_suite, floor_4, 'available'),
    ('402', type_junior_suite, floor_4, 'available'),
    ('403', type_junior_suite, floor_4, 'available'),
    ('404', type_junior_suite, floor_4, 'available'),
    ('405', type_superior, floor_4, 'available'),
    ('406', type_superior, floor_4, 'available')
  ON CONFLICT (room_number) DO NOTHING;

  -- П'ятий поверх - люкси
  INSERT INTO public.rooms (room_number, room_type_id, floor_id, status) VALUES
    ('501', type_suite, floor_5, 'available'),
    ('502', type_suite, floor_5, 'available'),
    ('503', type_junior_suite, floor_5, 'available'),
    ('504', type_junior_suite, floor_5, 'available')
  ON CONFLICT (room_number) DO NOTHING;

END $$;

-- =====================================================
-- SAMPLE GUESTS / ТЕСТОВІ ГОСТІ
-- =====================================================

INSERT INTO public.guests (
  first_name, last_name, email, phone, 
  document_type, document_number, nationality, 
  date_of_birth, city, country, guest_type, notes
) VALUES
  (
    'Олександр', 'Петренко', 'o.petrenko@gmail.com', '+380671234567',
    'passport', 'АА123456', 'Українська',
    '1985-03-15', 'Київ', 'Україна', 'individual', 'Постійний гість'
  ),
  (
    'Марія', 'Коваленко', 'maria.kovalenko@ukr.net', '+380501234567',
    'id_card', 'АВ987654', 'Українська',
    '1990-07-22', 'Львів', 'Україна', 'individual', NULL
  ),
  (
    'Іван', 'Шевченко', 'ivan.shevchenko@company.ua', '+380631234567',
    'passport', 'ВА456789', 'Українська',
    '1978-11-08', 'Одеса', 'Україна', 'corporate', 'Корпоративний клієнт - ТОВ "Інновації"'
  ),
  (
    'Анна', 'Бондаренко', 'anna.bond@gmail.com', '+380971234567',
    'passport', 'СА789012', 'Українська',
    '1995-02-28', 'Харків', 'Україна', 'individual', NULL
  ),
  (
    'Дмитро', 'Мельник', 'd.melnyk@business.ua', '+380661234567',
    'passport', 'DA345678', 'Українська',
    '1982-09-10', 'Дніпро', 'Україна', 'vip', 'VIP клієнт - особливі побажання'
  ),
  (
    'Юлія', 'Ткаченко', 'julia.tkachenko@mail.com', '+380931234567',
    'id_card', 'ЕА112233', 'Українська',
    '1988-05-17', 'Запоріжжя', 'Україна', 'individual', NULL
  ),
  (
    'Максим', 'Кравченко', 'max.kravchenko@corp.ua', '+380681234567',
    'passport', 'FA445566', 'Українська',
    '1975-12-03', 'Вінниця', 'Україна', 'corporate', 'Корпоративний клієнт - АТ "Технології"'
  ),
  (
    'Катерина', 'Лисенко', 'kateryna.lysenko@gmail.com', '+380951234567',
    'passport', 'GA778899', 'Українська',
    '1992-08-25', 'Полтава', 'Україна', 'individual', NULL
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- UPDATE GUEST VIP STATUS
-- =====================================================

UPDATE public.guests 
SET vip_status = true 
WHERE guest_type = 'vip';
