-- ===========================================================================
-- 005_room_rack_and_rules.sql
-- Фундамент для шахматки, політик передплати та state-machine переходів.
-- Скрипт ідемпотентний: безпечно запускати повторно.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Розширити reservation_rooms датами перебування й історією переселень.
--    Потрібно для split-stay (переселення в середині бронювання) і корректного
--    відображення шахматки, коли гість ночує у кількох номерах.
-- ---------------------------------------------------------------------------
ALTER TABLE reservation_rooms
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date   DATE,
  ADD COLUMN IF NOT EXISTS moved_from_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;

-- Заповнити значення з батьківської reservations для існуючих записів
UPDATE reservation_rooms rr
   SET start_date = r.check_in_date,
       end_date   = r.check_out_date
  FROM reservations r
 WHERE rr.reservation_id = r.id
   AND (rr.start_date IS NULL OR rr.end_date IS NULL);

-- Швидкий overlap-запит
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_period
  ON reservation_rooms (room_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- 2. Таблиця технічних блоків номера (maintenance / admin hold / out_of_order)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_blocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  block_type VARCHAR(30) NOT NULL DEFAULT 'maintenance',
  reason     TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_date >= start_date),
  CHECK (block_type IN ('maintenance','admin','out_of_order'))
);

CREATE INDEX IF NOT EXISTS idx_room_blocks_period
  ON room_blocks (room_id, start_date, end_date);

ALTER TABLE room_blocks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Таблиця налаштувань готелю (політика передплати, час заїзду, валюта)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hotel_settings (
  id                    INT PRIMARY KEY DEFAULT 1,
  prepayment_required   BOOLEAN NOT NULL DEFAULT true,
  prepayment_percent    NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  default_checkin_time  TIME NOT NULL DEFAULT '14:00',
  default_checkout_time TIME NOT NULL DEFAULT '12:00',
  currency              VARCHAR(3) NOT NULL DEFAULT 'UAH',
  locale                VARCHAR(10) NOT NULL DEFAULT 'uk-UA',
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT hotel_settings_singleton CHECK (id = 1)
);

INSERT INTO hotel_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE hotel_settings ENABLE ROW LEVEL SECURITY;

-- Базова політика: читати всі автентифіковані, писати лише system_administrator
DROP POLICY IF EXISTS hotel_settings_read_all ON hotel_settings;
CREATE POLICY hotel_settings_read_all ON hotel_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS room_blocks_read_all ON room_blocks;
CREATE POLICY room_blocks_read_all ON room_blocks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS room_blocks_write_staff ON room_blocks;
CREATE POLICY room_blocks_write_staff ON room_blocks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. Тригер автоматичного оновлення updated_at у нових таблицях
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hotel_settings_touch ON hotel_settings;
CREATE TRIGGER trg_hotel_settings_touch BEFORE UPDATE ON hotel_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Автоматичне вирівнювання paid_amount реєстрації після платежу.
--    Якщо додано payment_status='paid' — збільшуємо reservations.paid_amount.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_reservation_paid_amount() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' THEN
    UPDATE reservations
       SET paid_amount = COALESCE(paid_amount,0) + NEW.amount,
           updated_at  = NOW()
     WHERE id = NEW.reservation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_sync ON payments;
CREATE TRIGGER trg_payments_sync AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_reservation_paid_amount();
