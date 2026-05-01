-- ===========================================================================
-- 005_room_rack_and_rules.sql
-- AuraStay PMS
--
-- Фундамент для:
-- 1) операційного календаря номерного фонду / "шахматки";
-- 2) split-stay сценаріїв, коли гість переселяється між номерами;
-- 3) технічного та адміністративного блокування номерів;
-- 4) глобальних налаштувань готелю;
-- 5) політики передплати;
-- 6) автоматичного перерахунку оплат;
-- 7) перевірки overlap-конфліктів;
-- 8) журналювання критичних змін.
--
-- Скрипт ідемпотентний: більшість операцій можна безпечно запускати повторно.
-- Перед запуском на production обов'язково зробити backup бази даних.
-- ===========================================================================


-- ===========================================================================
-- 0. Базові передумови
-- ===========================================================================

-- uuid_generate_v4() вже використовується в поточній схемі.
-- Якщо розширення ще не ввімкнене, ця команда увімкне його.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ===========================================================================
-- 1. Розширення reservation_rooms для "шахматки" і переселень
-- ===========================================================================

-- Додаємо start_date і end_date саме на рівень reservation_rooms.
-- Це потрібно, бо одне бронювання може мати кілька номерів або переселення
-- в межах одного періоду проживання.
--
-- moved_from_room_id показує, з якого номера гостя переселили.
ALTER TABLE public.reservation_rooms
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS moved_from_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;


-- Заповнюємо start_date/end_date для вже існуючих reservation_rooms
-- на основі батьківського бронювання.
--
-- Це потрібно, щоб старі записи не зламали "шахматку".
UPDATE public.reservation_rooms rr
SET
  start_date = r.check_in_date,
  end_date   = r.check_out_date
FROM public.reservations r
WHERE rr.reservation_id = r.id
  AND (rr.start_date IS NULL OR rr.end_date IS NULL);


-- Індекс для швидкого пошуку бронювань у конкретному номері за періодом.
--
-- Використовується для:
-- - побудови "шахматки";
-- - перевірки доступності номера;
-- - пошуку overlap-конфліктів;
-- - переселення гостя.
CREATE INDEX IF NOT EXISTS idx_reservation_rooms_period
  ON public.reservation_rooms (room_id, start_date, end_date);


-- ===========================================================================
-- 2. Таблиця room_blocks
-- ===========================================================================

-- Таблиця room_blocks зберігає періоди, коли номер недоступний
-- не через проживання гостя, а через внутрішню причину:
-- - ремонт;
-- - адміністративне блокування;
-- - out of order.
CREATE TABLE IF NOT EXISTS public.room_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  block_type VARCHAR(30) NOT NULL DEFAULT 'maintenance',
  reason TEXT,

  created_by UUID REFERENCES public.users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT room_blocks_valid_period
    CHECK (end_date > start_date),

  CONSTRAINT room_blocks_valid_type
    CHECK (block_type IN ('maintenance', 'admin', 'out_of_order'))
);


-- Індекс для швидкої перевірки, чи заблокований номер у певний період.
CREATE INDEX IF NOT EXISTS idx_room_blocks_period
  ON public.room_blocks (room_id, start_date, end_date);


-- Вмикаємо Row Level Security для room_blocks.
ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- 3. Таблиця hotel_settings
-- ===========================================================================

-- Таблиця hotel_settings зберігає глобальні налаштування готелю:
-- - чи потрібна передплата;
-- - відсоток передплати;
-- - час заїзду/виїзду;
-- - валюту;
-- - локаль.
--
-- id = 1 означає singleton-таблицю: у системі має бути лише один запис.
CREATE TABLE IF NOT EXISTS public.hotel_settings (
  id INT PRIMARY KEY DEFAULT 1,

  prepayment_required BOOLEAN NOT NULL DEFAULT true,
  prepayment_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00,

  default_checkin_time TIME NOT NULL DEFAULT '14:00',
  default_checkout_time TIME NOT NULL DEFAULT '12:00',

  currency VARCHAR(3) NOT NULL DEFAULT 'UAH',
  locale VARCHAR(10) NOT NULL DEFAULT 'uk-UA',

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT hotel_settings_singleton
    CHECK (id = 1),

  CONSTRAINT hotel_settings_valid_prepayment_percent
    CHECK (prepayment_percent >= 0 AND prepayment_percent <= 100),

  CONSTRAINT hotel_settings_valid_currency
    CHECK (char_length(currency) = 3)
);


-- Створюємо базовий запис налаштувань, якщо його ще немає.
INSERT INTO public.hotel_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;


-- Вмикаємо Row Level Security для hotel_settings.
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- 4. Загальна функція оновлення updated_at
-- ===========================================================================

-- Функція автоматично оновлює updated_at перед UPDATE.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Тригер для hotel_settings.
DROP TRIGGER IF EXISTS trg_hotel_settings_touch ON public.hotel_settings;

CREATE TRIGGER trg_hotel_settings_touch
BEFORE UPDATE ON public.hotel_settings
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();


-- Тригер для room_blocks.
DROP TRIGGER IF EXISTS trg_room_blocks_touch ON public.room_blocks;

CREATE TRIGGER trg_room_blocks_touch
BEFORE UPDATE ON public.room_blocks
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();


-- ===========================================================================
-- 5. RLS policies для hotel_settings
-- ===========================================================================

-- Видаляємо старі політики, якщо вони вже існують.
DROP POLICY IF EXISTS hotel_settings_read_all ON public.hotel_settings;
DROP POLICY IF EXISTS hotel_settings_admin_update ON public.hotel_settings;
DROP POLICY IF EXISTS hotel_settings_admin_insert ON public.hotel_settings;
DROP POLICY IF EXISTS hotel_settings_admin_delete ON public.hotel_settings;


-- Читати налаштування можуть усі автентифіковані користувачі.
-- Це потрібно, бо валюта, локаль, час заїзду/виїзду і передплата
-- використовуються в різних модулях системи.
CREATE POLICY hotel_settings_read_all
ON public.hotel_settings
FOR SELECT
TO authenticated
USING (true);


-- Оновлювати налаштування може лише системний адміністратор.
CREATE POLICY hotel_settings_admin_update
ON public.hotel_settings
FOR UPDATE
TO authenticated
USING (public.get_user_role() = 'system_administrator')
WITH CHECK (public.get_user_role() = 'system_administrator');


-- Створювати запис налаштувань може лише системний адміністратор.
-- На практиці запис створюється міграцією, але policy залишаємо для повноти.
CREATE POLICY hotel_settings_admin_insert
ON public.hotel_settings
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role() = 'system_administrator'
  AND id = 1
);


-- Видаляти налаштування теж може лише системний адміністратор.
-- У реальній системі видалення краще не використовувати, але policy контрольована.
CREATE POLICY hotel_settings_admin_delete
ON public.hotel_settings
FOR DELETE
TO authenticated
USING (public.get_user_role() = 'system_administrator');


-- ===========================================================================
-- 6. RLS policies для room_blocks
-- ===========================================================================

DROP POLICY IF EXISTS room_blocks_read_all ON public.room_blocks;
DROP POLICY IF EXISTS room_blocks_write_staff ON public.room_blocks;
DROP POLICY IF EXISTS room_blocks_insert_authorized ON public.room_blocks;
DROP POLICY IF EXISTS room_blocks_update_authorized ON public.room_blocks;
DROP POLICY IF EXISTS room_blocks_delete_authorized ON public.room_blocks;


-- Читати блокування номерів можуть усі автентифіковані користувачі.
-- Це потрібно для "шахматки", рецепції, housekeeping і maintenance.
CREATE POLICY room_blocks_read_all
ON public.room_blocks
FOR SELECT
TO authenticated
USING (true);


-- Створювати блокування можуть тільки відповідальні ролі.
CREATE POLICY room_blocks_insert_authorized
ON public.room_blocks
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_role() IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager',
    'housekeeping_supervisor',
    'maintenance_manager'
  )
);


-- Оновлювати блокування можуть тільки відповідальні ролі.
CREATE POLICY room_blocks_update_authorized
ON public.room_blocks
FOR UPDATE
TO authenticated
USING (
  public.get_user_role() IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager',
    'housekeeping_supervisor',
    'maintenance_manager'
  )
)
WITH CHECK (
  public.get_user_role() IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager',
    'housekeeping_supervisor',
    'maintenance_manager'
  )
);


-- Видаляти блокування можуть тільки відповідальні ролі.
CREATE POLICY room_blocks_delete_authorized
ON public.room_blocks
FOR DELETE
TO authenticated
USING (
  public.get_user_role() IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager',
    'housekeeping_supervisor',
    'maintenance_manager'
  )
);


-- ===========================================================================
-- 7. DB-level валідація reservation_rooms
-- ===========================================================================

-- Ця функція:
-- 1) автоматично підставляє start_date/end_date з reservations,
--    якщо app-level не передав ці дати;
-- 2) перевіряє, що end_date > start_date;
-- 3) перевіряє, що період room assignment не виходить за межі бронювання;
-- 4) забороняє overlap з іншими reservation_rooms;
-- 5) забороняє overlap з room_blocks.
--
-- Важливо:
-- Використовується daterange(..., '[)'), тобто end_date не включається.
-- Це правильно для готелю:
-- гість може виїхати 05.05, а інший гість може заїхати 05.05.
CREATE OR REPLACE FUNCTION public.validate_reservation_room_period()
RETURNS TRIGGER AS $$
DECLARE
  parent_check_in DATE;
  parent_check_out DATE;
BEGIN
  -- Отримуємо дати батьківського бронювання.
  SELECT r.check_in_date, r.check_out_date
  INTO parent_check_in, parent_check_out
  FROM public.reservations r
  WHERE r.id = NEW.reservation_id;

  -- Якщо бронювання не знайдено, не пропускаємо запис.
  IF parent_check_in IS NULL OR parent_check_out IS NULL THEN
    RAISE EXCEPTION 'Reservation % not found for reservation_rooms record', NEW.reservation_id;
  END IF;

  -- Якщо app-level не передав дати, автоматично беремо дати бронювання.
  IF NEW.start_date IS NULL THEN
    NEW.start_date := parent_check_in;
  END IF;

  IF NEW.end_date IS NULL THEN
    NEW.end_date := parent_check_out;
  END IF;

  -- Період проживання у номері має бути валідним.
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'reservation_rooms.end_date must be greater than start_date';
  END IF;

  -- Період конкретного номера не повинен виходити за межі бронювання.
  IF NEW.start_date < parent_check_in OR NEW.end_date > parent_check_out THEN
    RAISE EXCEPTION
      'reservation_rooms period % - % is outside reservation period % - %',
      NEW.start_date, NEW.end_date, parent_check_in, parent_check_out;
  END IF;

  -- Якщо room_id ще не призначений, overlap по конкретному номеру не перевіряємо.
  -- Це дозволяє зберігати type-based reservation без конкретного номера.
  IF NEW.room_id IS NOT NULL THEN

    -- Перевірка overlap з іншими reservation_rooms у цьому ж номері.
    IF EXISTS (
      SELECT 1
      FROM public.reservation_rooms rr
      JOIN public.reservations r ON r.id = rr.reservation_id
      WHERE rr.room_id = NEW.room_id
        AND rr.id <> NEW.id
        AND r.status NOT IN ('cancelled', 'no_show')
        AND rr.start_date IS NOT NULL
        AND rr.end_date IS NOT NULL
        AND daterange(rr.start_date, rr.end_date, '[)')
            && daterange(NEW.start_date, NEW.end_date, '[)')
    ) THEN
      RAISE EXCEPTION
        'Room % is already assigned to another reservation in the selected period % - %',
        NEW.room_id, NEW.start_date, NEW.end_date;
    END IF;

    -- Перевірка overlap з технічними/адміністративними блокуваннями.
    IF EXISTS (
      SELECT 1
      FROM public.room_blocks rb
      WHERE rb.room_id = NEW.room_id
        AND daterange(rb.start_date, rb.end_date, '[)')
            && daterange(NEW.start_date, NEW.end_date, '[)')
    ) THEN
      RAISE EXCEPTION
        'Room % is blocked in the selected period % - %',
        NEW.room_id, NEW.start_date, NEW.end_date;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_validate_reservation_room_period
ON public.reservation_rooms;

CREATE TRIGGER trg_validate_reservation_room_period
BEFORE INSERT OR UPDATE
ON public.reservation_rooms
FOR EACH ROW
EXECUTE FUNCTION public.validate_reservation_room_period();


-- ===========================================================================
-- 8. DB-level валідація room_blocks
-- ===========================================================================

-- Ця функція:
-- 1) перевіряє валідність періоду блокування;
-- 2) забороняє overlap з іншими room_blocks;
-- 3) забороняє блокування номера, якщо в цей період уже є активне бронювання.
CREATE OR REPLACE FUNCTION public.validate_room_block_period()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'room_blocks.end_date must be greater than start_date';
  END IF;

  -- Забороняємо overlap з іншим блокуванням цього самого номера.
  IF EXISTS (
    SELECT 1
    FROM public.room_blocks rb
    WHERE rb.room_id = NEW.room_id
      AND rb.id <> NEW.id
      AND daterange(rb.start_date, rb.end_date, '[)')
          && daterange(NEW.start_date, NEW.end_date, '[)')
  ) THEN
    RAISE EXCEPTION
      'Room % already has another block in the selected period % - %',
      NEW.room_id, NEW.start_date, NEW.end_date;
  END IF;

  -- Забороняємо створити блокування поверх активного бронювання.
  IF EXISTS (
    SELECT 1
    FROM public.reservation_rooms rr
    JOIN public.reservations r ON r.id = rr.reservation_id
    WHERE rr.room_id = NEW.room_id
      AND r.status NOT IN ('cancelled', 'no_show')
      AND rr.start_date IS NOT NULL
      AND rr.end_date IS NOT NULL
      AND daterange(rr.start_date, rr.end_date, '[)')
          && daterange(NEW.start_date, NEW.end_date, '[)')
  ) THEN
    RAISE EXCEPTION
      'Room % has an active reservation in the selected block period % - %',
      NEW.room_id, NEW.start_date, NEW.end_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_validate_room_block_period
ON public.room_blocks;

CREATE TRIGGER trg_validate_room_block_period
BEFORE INSERT OR UPDATE
ON public.room_blocks
FOR EACH ROW
EXECUTE FUNCTION public.validate_room_block_period();


-- ===========================================================================
-- 9. Перерахунок paid_amount і balance у reservations
-- ===========================================================================

-- Попередня версія тільки додавала NEW.amount до paid_amount після INSERT.
-- Це було ризиковано, бо:
-- - UPDATE платежу не перераховував бронювання;
-- - DELETE платежу не перераховував бронювання;
-- - refund/failed не враховувалися коректно;
-- - balance залишався старим.
--
-- Нова логіка не додає суму інкрементально.
-- Вона кожного разу перераховує paid_amount з таблиці payments.
CREATE OR REPLACE FUNCTION public.recalculate_reservation_payment_totals(target_reservation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.reservations r
  SET
    paid_amount = COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.reservation_id = target_reservation_id
        AND p.payment_status = 'paid'
    ), 0),
    balance = r.total_amount - COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.reservation_id = target_reservation_id
        AND p.payment_status = 'paid'
    ), 0),
    updated_at = NOW()
  WHERE r.id = target_reservation_id;
END;
$$ LANGUAGE plpgsql;


-- Trigger-function для INSERT/UPDATE/DELETE payments.
CREATE OR REPLACE FUNCTION public.sync_reservation_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: перерахувати бронювання з NEW.reservation_id.
  IF TG_OP = 'INSERT' THEN
    IF NEW.reservation_id IS NOT NULL THEN
      PERFORM public.recalculate_reservation_payment_totals(NEW.reservation_id);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE:
  -- Якщо reservation_id змінився, треба перерахувати і старе, і нове бронювання.
  IF TG_OP = 'UPDATE' THEN
    IF OLD.reservation_id IS NOT NULL THEN
      PERFORM public.recalculate_reservation_payment_totals(OLD.reservation_id);
    END IF;

    IF NEW.reservation_id IS NOT NULL
       AND (OLD.reservation_id IS DISTINCT FROM NEW.reservation_id) THEN
      PERFORM public.recalculate_reservation_payment_totals(NEW.reservation_id);
    ELSIF NEW.reservation_id IS NOT NULL THEN
      PERFORM public.recalculate_reservation_payment_totals(NEW.reservation_id);
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE: перерахувати бронювання з OLD.reservation_id.
  IF TG_OP = 'DELETE' THEN
    IF OLD.reservation_id IS NOT NULL THEN
      PERFORM public.recalculate_reservation_payment_totals(OLD.reservation_id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_payments_sync ON public.payments;

CREATE TRIGGER trg_payments_sync
AFTER INSERT OR UPDATE OR DELETE
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_reservation_paid_amount();


-- ===========================================================================
-- 10. Audit logging для room_blocks і hotel_settings
-- ===========================================================================

-- Допоміжна функція повертає auth.uid(), тільки якщо такий користувач існує
-- у public.users. Це захищає audit_logs від помилки foreign key.
CREATE OR REPLACE FUNCTION public.safe_current_user_id()
RETURNS UUID AS $$
DECLARE
  current_uid UUID;
BEGIN
  current_uid := auth.uid();

  IF current_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users u WHERE u.id = current_uid) THEN
    RETURN current_uid;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Універсальна функція аудиту для критичних таблиць.
--
-- Вона записує:
-- - хто виконав дію;
-- - яку дію виконав;
-- - яку сутність змінив;
-- - id сутності;
-- - старі та нові значення.
CREATE OR REPLACE FUNCTION public.audit_critical_changes()
RETURNS TRIGGER AS $$
DECLARE
  entity_uuid UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    entity_uuid := NEW.id;

    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      changes,
      created_at
    )
    VALUES (
      public.safe_current_user_id(),
      'INSERT',
      TG_TABLE_NAME,
      entity_uuid,
      jsonb_build_object(
        'new', to_jsonb(NEW)
      ),
      NOW()
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    entity_uuid := NEW.id;

    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      changes,
      created_at
    )
    VALUES (
      public.safe_current_user_id(),
      'UPDATE',
      TG_TABLE_NAME,
      entity_uuid,
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      ),
      NOW()
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    entity_uuid := OLD.id;

    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      changes,
      created_at
    )
    VALUES (
      public.safe_current_user_id(),
      'DELETE',
      TG_TABLE_NAME,
      entity_uuid,
      jsonb_build_object(
        'old', to_jsonb(OLD)
      ),
      NOW()
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Audit для room_blocks.
DROP TRIGGER IF EXISTS trg_audit_room_blocks
ON public.room_blocks;

CREATE TRIGGER trg_audit_room_blocks
AFTER INSERT OR UPDATE OR DELETE
ON public.room_blocks
FOR EACH ROW
EXECUTE FUNCTION public.audit_critical_changes();


-- Audit для hotel_settings.
DROP TRIGGER IF EXISTS trg_audit_hotel_settings
ON public.hotel_settings;

CREATE TRIGGER trg_audit_hotel_settings
AFTER INSERT OR UPDATE OR DELETE
ON public.hotel_settings
FOR EACH ROW
EXECUTE FUNCTION public.audit_critical_changes();


-- ===========================================================================
-- 11. Фінальна синхронізація існуючих бронювань
-- ===========================================================================

-- Після створення нового механізму перерахунку оплат варто один раз
-- синхронізувати всі існуючі reservations.
DO $$
DECLARE
  reservation_record RECORD;
BEGIN
  FOR reservation_record IN
    SELECT id FROM public.reservations
  LOOP
    PERFORM public.recalculate_reservation_payment_totals(reservation_record.id);
  END LOOP;
END;
$$;


-- ===========================================================================
-- Кінець міграції 005_room_rack_and_rules.sql
-- ===========================================================================