-- =====================================================
-- AuraStay HMS - Core Schema
-- Основна схема бази даних для системи управління готелем
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES / ТИПИ ПЕРЕЛІЧЕНЬ
-- =====================================================

-- Роль користувача в системі
CREATE TYPE user_role AS ENUM (
  'admin',           -- Адміністратор системи
  'manager',         -- Менеджер готелю
  'receptionist',    -- Адміністратор рецепції
  'housekeeper',     -- Покоївка
  'maintenance'      -- Технічний персонал
);

-- Статус номера (фізичний стан)
CREATE TYPE room_status AS ENUM (
  'available',       -- Вільний (готовий до заселення)
  'occupied',        -- Зайнятий (гість проживає)
  'dirty',           -- Брудний (потребує прибирання)
  'cleaning',        -- На прибиранні
  'maintenance',     -- На обслуговуванні/ремонті
  'out_of_order'     -- Виведений з експлуатації
);

-- Статус бронювання
CREATE TYPE reservation_status AS ENUM (
  'pending',         -- Очікує підтвердження
  'confirmed',       -- Підтверджено
  'checked_in',      -- Заселено
  'checked_out',     -- Виселено
  'cancelled',       -- Скасовано
  'no_show'          -- Неявка
);

-- Тип завдання прибирання
CREATE TYPE housekeeping_task_type AS ENUM (
  'daily',           -- Щоденне прибирання
  'checkout',        -- Прибирання після виїзду
  'deep_clean',      -- Генеральне прибирання
  'turndown',        -- Вечірня підготовка
  'inspection'       -- Інспекція
);

-- Статус завдання прибирання
CREATE TYPE housekeeping_status AS ENUM (
  'pending',         -- Очікує
  'in_progress',     -- Виконується
  'completed',       -- Завершено
  'verified',        -- Перевірено
  'needs_attention'  -- Потребує уваги
);

-- Пріоритет завдання
CREATE TYPE task_priority AS ENUM (
  'low',             -- Низький
  'medium',          -- Середній
  'high',            -- Високий
  'urgent'           -- Терміновий
);

-- Статус технічного завдання
CREATE TYPE maintenance_status AS ENUM (
  'reported',        -- Зареєстровано
  'assigned',        -- Призначено
  'in_progress',     -- Виконується
  'completed',       -- Завершено
  'cancelled'        -- Скасовано
);

-- Тип оплати
CREATE TYPE payment_type AS ENUM (
  'cash',            -- Готівка
  'card',            -- Картка
  'bank_transfer',   -- Банківський переказ
  'online'           -- Онлайн оплата
);

-- Статус оплати
CREATE TYPE payment_status AS ENUM (
  'pending',         -- Очікує
  'partial',         -- Часткова
  'paid',            -- Оплачено
  'refunded'         -- Повернено
);

-- Тип гостя
CREATE TYPE guest_type AS ENUM (
  'individual',      -- Фізична особа
  'corporate',       -- Корпоративний клієнт
  'group',           -- Група
  'vip'              -- VIP-клієнт
);

-- =====================================================
-- CORE TABLES / ОСНОВНІ ТАБЛИЦІ
-- =====================================================

-- Профілі користувачів (пов'язані з auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'receptionist',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Категорії/типи номерів
CREATE TABLE IF NOT EXISTS public.room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  name_uk TEXT NOT NULL,              -- Назва українською
  description TEXT,
  description_uk TEXT,                -- Опис українською
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
  max_occupancy INTEGER NOT NULL DEFAULT 2 CHECK (max_occupancy > 0),
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Поверхи
CREATE TABLE IF NOT EXISTS public.floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number INTEGER NOT NULL UNIQUE,
  name TEXT,                          -- Наприклад: "Перший поверх"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Номери готелю
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT NOT NULL UNIQUE,
  room_type_id UUID NOT NULL REFERENCES public.room_types(id),
  floor_id UUID REFERENCES public.floors(id),
  status room_status NOT NULL DEFAULT 'available',
  current_reservation_id UUID,        -- Поточне бронювання (для зайнятих номерів)
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Зручності
CREATE TABLE IF NOT EXISTS public.amenities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  name_uk TEXT NOT NULL,
  icon TEXT,
  category TEXT,                      -- wifi, bathroom, entertainment, etc.
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Зручності номера (зв'язок багато-до-багатьох)
CREATE TABLE IF NOT EXISTS public.room_amenities (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, amenity_id)
);

-- Гості
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  document_type TEXT,                 -- passport, id_card, driver_license
  document_number TEXT,
  nationality TEXT,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Україна',
  guest_type guest_type NOT NULL DEFAULT 'individual',
  company_name TEXT,                  -- Для корпоративних клієнтів
  vip_status BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  total_stays INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Бронювання
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confirmation_number TEXT NOT NULL UNIQUE,
  guest_id UUID NOT NULL REFERENCES public.guests(id),
  room_id UUID REFERENCES public.rooms(id),
  room_type_id UUID NOT NULL REFERENCES public.room_types(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  status reservation_status NOT NULL DEFAULT 'pending',
  adults INTEGER NOT NULL DEFAULT 1 CHECK (adults > 0),
  children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
  rate_per_night DECIMAL(10,2) NOT NULL CHECK (rate_per_night > 0),
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  payment_status payment_status NOT NULL DEFAULT 'pending',
  source TEXT DEFAULT 'direct',       -- direct, booking, expedia, phone, etc.
  special_requests TEXT,
  internal_notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  no_show_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Бізнес-правило: дата виїзду повинна бути після дати заїзду
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
  -- Бізнес-правило: оплачена сума не може перевищувати загальну
  CONSTRAINT valid_payment CHECK (paid_amount <= total_amount)
);

-- Додаткові гості в бронюванні
CREATE TABLE IF NOT EXISTS public.reservation_guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reservation_id, guest_id)
);

-- Оплати
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_type payment_type NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Історія статусів бронювання
CREATE TABLE IF NOT EXISTS public.reservation_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  old_status reservation_status,
  new_status reservation_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Історія статусів номерів
CREATE TABLE IF NOT EXISTS public.room_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  old_status room_status,
  new_status room_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Завдання прибирання
CREATE TABLE IF NOT EXISTS public.housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  task_type housekeeping_task_type NOT NULL,
  status housekeeping_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Технічні завдання
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id),
  title TEXT NOT NULL,
  description TEXT,
  status maintenance_status NOT NULL DEFAULT 'reported',
  priority task_priority NOT NULL DEFAULT 'medium',
  category TEXT,                      -- plumbing, electrical, hvac, furniture, etc.
  assigned_to UUID REFERENCES public.profiles(id),
  reported_by UUID REFERENCES public.profiles(id),
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  notes TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Журнал аудиту
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,               -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES public.profiles(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Налаштування системи
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- =====================================================
-- INDEXES / ІНДЕКСИ
-- =====================================================

-- Профілі
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active) WHERE is_active = true;

-- Номери
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON public.rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rooms_available ON public.rooms(status) WHERE status = 'available';

-- Гості
CREATE INDEX IF NOT EXISTS idx_guests_phone ON public.guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_email ON public.guests(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_name ON public.guests(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_guests_document ON public.guests(document_number) WHERE document_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_vip ON public.guests(vip_status) WHERE vip_status = true;

-- Бронювання
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON public.reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin ON public.reservations(check_in_date);
CREATE INDEX IF NOT EXISTS idx_reservations_checkout ON public.reservations(check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation ON public.reservations(confirmation_number);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON public.reservations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reservations_active ON public.reservations(status) 
  WHERE status IN ('pending', 'confirmed', 'checked_in');

-- Оплати
CREATE INDEX IF NOT EXISTS idx_payments_reservation ON public.payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- Завдання прибирання
CREATE INDEX IF NOT EXISTS idx_housekeeping_room ON public.housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_status ON public.housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_assigned ON public.housekeeping_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_housekeeping_date ON public.housekeeping_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_housekeeping_pending ON public.housekeeping_tasks(status, scheduled_date) 
  WHERE status = 'pending';

-- Технічні завдання
CREATE INDEX IF NOT EXISTS idx_maintenance_room ON public.maintenance_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned ON public.maintenance_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON public.maintenance_tasks(priority, status);

-- Аудит
CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at);

-- Історія статусів
CREATE INDEX IF NOT EXISTS idx_res_status_history_reservation ON public.reservation_status_history(reservation_id);
CREATE INDEX IF NOT EXISTS idx_room_status_history_room ON public.room_status_history(room_id);
