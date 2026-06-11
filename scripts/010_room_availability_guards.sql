--Я ВИКОНАЛА
-- Захист доступності номерів.
-- Перевірки в інтерфейсі корисні, але цілісність номерного фонду
-- також має бути гарантована на рівні бази даних.

CREATE OR REPLACE FUNCTION public.reservation_status_blocks_inventory(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('pending', 'confirmed', 'checked_in');
$$;

CREATE OR REPLACE FUNCTION public.room_status_blocks_sales(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('maintenance', 'out_of_order', 'blocked');
$$;

CREATE OR REPLACE FUNCTION public.room_status_ready_for_check_in(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('available', 'inspected');
$$;

CREATE OR REPLACE FUNCTION public.room_status_allowed_with_check_in_override(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('dirty', 'cleaning', 'inspecting', 'occupied');
$$;

-- Атомарний RPC шахматки має оновити reservations і reservation_rooms
-- двома окремими SQL-запитами. Під час цієї контрольованої операції тригери
-- перевірки перетинів можуть короткочасно побачити проміжний стан. Тому вони
-- можуть пропустити власні перевірки лише тоді, коли запит виконується
-- в контексті власника SECURITY DEFINER-функції
-- public.move_room_rack_reservation_room().
--
-- Самої перевірки користувацького GUC недостатньо, оскільки ролі застосунку
-- можуть встановлювати довільні значення app.*. Порівняння current_user
-- із власником RPC не дозволяє клієнту вимкнути захист через set_config(...).
CREATE OR REPLACE FUNCTION public.room_rack_atomic_move_is_allowed()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  rpc_owner name;
BEGIN
  IF current_setting('app.room_rack_atomic_move', true) IS DISTINCT FROM 'on' THEN
    RETURN false;
  END IF;

  SELECT pg_get_userbyid(p.proowner)
  INTO rpc_owner
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.move_room_rack_reservation_room(uuid, uuid, date, date, numeric, numeric)');

  RETURN rpc_owner IS NOT NULL AND current_user = rpc_owner;
END;
$$;

-- Міграція 008 перевіряє reservation_rooms відносно поточного батьківського
-- рядка reservations. Атомарний RPC має оновити дочірній і батьківський рядки
-- окремими запитами, тому лише контрольованій власником операції дозволено
-- пройти через проміжний стан. Фінальний стан RPC перевіряє самостійно.
CREATE OR REPLACE FUNCTION public.validate_reservation_room_period()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_check_in date;
  parent_check_out date;
  effective_check_in date;
  effective_check_out date;
BEGIN
  IF public.room_rack_atomic_move_is_allowed() THEN
    RETURN NEW;
  END IF;

  SELECT r.check_in_date, r.check_out_date
  INTO parent_check_in, parent_check_out
  FROM public.reservations r
  WHERE r.id = NEW.reservation_id;

  IF parent_check_in IS NULL OR parent_check_out IS NULL THEN
    RAISE EXCEPTION 'reservation % not found for reservation_rooms row', NEW.reservation_id;
  END IF;

  effective_check_in := COALESCE(NEW.check_in_time::date, parent_check_in);
  effective_check_out := COALESCE(NEW.check_out_time::date, parent_check_out);

  IF effective_check_in < parent_check_in OR effective_check_out > parent_check_out THEN
    RAISE EXCEPTION
      'reservation_rooms period % - % is outside reservation period % - %',
      effective_check_in,
      effective_check_out,
      parent_check_in,
      parent_check_out
      USING ERRCODE = 'P0001';
  END IF;

  IF effective_check_out < effective_check_in THEN
    RAISE EXCEPTION
      'reservation_rooms period % - % is invalid',
      effective_check_in,
      effective_check_out
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_active_reservation_room_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status text;
  parent_check_in date;
  parent_check_out date;
  new_check_in date;
  new_check_out date;
  conflicting_reservation_number text;
BEGIN
  -- Лише контрольований RPC може тимчасово пропустити цей тригер.
  -- Прямі записи в таблицю все одно перевіряються на перетини, навіть якщо
  -- клієнт спробує встановити app.room_rack_atomic_move.
  IF public.room_rack_atomic_move_is_allowed() THEN
    RETURN NEW;
  END IF;

  IF NEW.room_id IS NULL OR NEW.reservation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.status, r.check_in_date, r.check_out_date
  INTO parent_status, parent_check_in, parent_check_out
  FROM public.reservations r
  WHERE r.id = NEW.reservation_id;

  IF parent_status IS NULL THEN
    RAISE EXCEPTION 'reservation % not found for reservation_rooms row', NEW.reservation_id;
  END IF;

  IF NOT public.reservation_status_blocks_inventory(parent_status) THEN
    RETURN NEW;
  END IF;

  new_check_in := COALESCE(NEW.check_in_time::date, parent_check_in);
  new_check_out := COALESCE(NEW.check_out_time::date, parent_check_out);

  -- Серіалізуємо записи окремо для кожного номера. Без цього дві паралельні
  -- транзакції можуть одночасно не побачити конфлікту, а потім зберегти
  -- бронювання з перетином дат.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.room_id::text, 0));

  SELECT r.reservation_number
  INTO conflicting_reservation_number
  FROM public.reservation_rooms rr
  JOIN public.reservations r ON r.id = rr.reservation_id
  WHERE rr.room_id = NEW.room_id
    AND rr.id IS DISTINCT FROM NEW.id
    AND r.id IS DISTINCT FROM NEW.reservation_id
    AND public.reservation_status_blocks_inventory(r.status::text)
    AND COALESCE(rr.check_in_time::date, r.check_in_date) < new_check_out
    AND COALESCE(rr.check_out_time::date, r.check_out_date) > new_check_in
  LIMIT 1;

  IF conflicting_reservation_number IS NOT NULL THEN
    RAISE EXCEPTION
      'room is already reserved by active reservation % for overlapping dates',
      conflicting_reservation_number
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_active_reservation_room_overlap_before_write ON public.reservation_rooms;
CREATE TRIGGER prevent_active_reservation_room_overlap_before_write
  BEFORE INSERT OR UPDATE OF room_id, reservation_id, check_in_time, check_out_time ON public.reservation_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_active_reservation_room_overlap();

CREATE OR REPLACE FUNCTION public.prevent_active_reservation_overlap_on_reservation_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  conflicting_reservation_number text;
BEGIN
  -- Див. public.room_rack_atomic_move_is_allowed() вище. RPC сам перевіряє
  -- конфлікти фінального стану перед збереженням нових дат і номера.
  IF public.room_rack_atomic_move_is_allowed() THEN
    RETURN NEW;
  END IF;

  IF NOT public.reservation_status_blocks_inventory(NEW.status::text) THEN
    RETURN NEW;
  END IF;

  -- Перед перевіркою перетинів блокуємо всі номери бронювання у стабільному
  -- порядку. Це усуває перегони між паралельними змінами дат або статусу.
  PERFORM pg_advisory_xact_lock(hashtextextended(locked_rooms.room_id::text, 0))
  FROM (
    SELECT DISTINCT own_rr.room_id
    FROM public.reservation_rooms own_rr
    WHERE own_rr.reservation_id = NEW.id
      AND own_rr.room_id IS NOT NULL
    ORDER BY own_rr.room_id
  ) locked_rooms;

  SELECT other_res.reservation_number
  INTO conflicting_reservation_number
  FROM public.reservation_rooms own_rr
  JOIN public.reservation_rooms other_rr ON other_rr.room_id = own_rr.room_id
  JOIN public.reservations other_res ON other_res.id = other_rr.reservation_id
  WHERE own_rr.reservation_id = NEW.id
    AND own_rr.room_id IS NOT NULL
    AND other_res.id IS DISTINCT FROM NEW.id
    AND public.reservation_status_blocks_inventory(other_res.status::text)
    AND COALESCE(own_rr.check_in_time::date, NEW.check_in_date) <
        COALESCE(other_rr.check_out_time::date, other_res.check_out_date)
    AND COALESCE(own_rr.check_out_time::date, NEW.check_out_date) >
        COALESCE(other_rr.check_in_time::date, other_res.check_in_date)
  LIMIT 1;

  IF conflicting_reservation_number IS NOT NULL THEN
    RAISE EXCEPTION
      'reservation status/date update creates room overlap with active reservation %',
      conflicting_reservation_number
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_active_reservation_overlap_before_reservation_update ON public.reservations;
CREATE TRIGGER prevent_active_reservation_overlap_before_reservation_update
  BEFORE UPDATE OF status, check_in_date, check_out_date ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_active_reservation_overlap_on_reservation_update();

CREATE OR REPLACE FUNCTION public.guard_reservation_check_in_room_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  blocked_room record;
  override_room record;
BEGIN
  IF NEW.status IS DISTINCT FROM 'checked_in' OR OLD.status IS NOT DISTINCT FROM 'checked_in' THEN
    RETURN NEW;
  END IF;

  SELECT rooms.room_number, rooms.status
  INTO blocked_room
  FROM public.reservation_rooms rr
  JOIN public.rooms rooms ON rooms.id = rr.room_id
  WHERE rr.reservation_id = NEW.id
    AND public.room_status_blocks_sales(rooms.status::text)
  LIMIT 1;

  IF blocked_room.room_number IS NOT NULL THEN
    RAISE EXCEPTION
      'room % status % does not allow check-in',
      blocked_room.room_number,
      blocked_room.status
      USING ERRCODE = 'P0001';
  END IF;

  SELECT rooms.room_number, rooms.status
  INTO override_room
  FROM public.reservation_rooms rr
  JOIN public.rooms rooms ON rooms.id = rr.room_id
  WHERE rr.reservation_id = NEW.id
    AND NOT public.room_status_ready_for_check_in(rooms.status::text)
    AND public.room_status_allowed_with_check_in_override(rooms.status::text)
  LIMIT 1;

  IF override_room.room_number IS NOT NULL
     AND COALESCE(NEW.special_requests, '') NOT ILIKE '%[Службове заселення]%' THEN
    RAISE EXCEPTION
      'room % status % requires check-in override note',
      override_room.room_number,
      override_room.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_reservation_check_in_room_status_before_update ON public.reservations;
CREATE TRIGGER guard_reservation_check_in_room_status_before_update
  BEFORE UPDATE OF status ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_reservation_check_in_room_status();

-- Атомарна операція переміщення або зміни тривалості в шахматці.
-- Застосовує фінальні дати бронювання, цільовий номер і його тип, ставку
-- за ніч та загальну суму в межах однієї транзакції бази даних.
-- Тригери перетинів вище пропускають лише проміжний стан усередині цієї
-- SECURITY DEFINER-функції; перед записом вона самостійно перевіряє
-- фінальний стан на конфлікти.
CREATE OR REPLACE FUNCTION public.move_room_rack_reservation_room(
  p_reservation_room_id uuid,
  p_target_room_id uuid,
  p_check_in_date date,
  p_check_out_date date,
  p_total_amount numeric,
  p_rate numeric
)
RETURNS TABLE (
  reservation_room_id uuid,
  reservation_id uuid,
  room_id uuid,
  room_type_id uuid,
  check_in_date date,
  check_out_date date,
  total_amount numeric,
  paid_amount numeric,
  balance numeric,
  rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
  current_row record;
  target_room record;
  conflicting_reservation_number text;
BEGIN
  SELECT public.current_profile_role()::text INTO actor_role;

  IF auth.uid() IS NULL OR actor_role NOT IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager',
    'front_desk_agent',
    'reservations_manager'
  ) THEN
    RAISE EXCEPTION 'not allowed to update room-rack reservations' USING ERRCODE = '42501';
  END IF;

  IF p_reservation_room_id IS NULL OR p_target_room_id IS NULL THEN
    RAISE EXCEPTION 'reservation room and target room are required' USING ERRCODE = '22004';
  END IF;

  IF p_check_in_date IS NULL OR p_check_out_date IS NULL OR p_check_out_date <= p_check_in_date THEN
    RAISE EXCEPTION 'invalid reservation dates' USING ERRCODE = '22007';
  END IF;

  IF p_total_amount IS NULL OR p_total_amount < 0 THEN
    RAISE EXCEPTION 'invalid reservation total amount' USING ERRCODE = '22003';
  END IF;

  IF p_rate IS NOT NULL AND p_rate < 0 THEN
    RAISE EXCEPTION 'invalid room rate' USING ERRCODE = '22003';
  END IF;

  SELECT
    rr.id AS reservation_room_id,
    rr.reservation_id,
    rr.room_id AS current_room_id,
    rr.rate AS current_rate,
    r.status,
    r.reservation_number,
    r.check_in_date AS current_check_in_date,
    r.check_out_date AS current_check_out_date,
    COALESCE(r.paid_amount, 0) AS paid_amount
  INTO current_row
  FROM public.reservation_rooms rr
  JOIN public.reservations r ON r.id = rr.reservation_id
  WHERE rr.id = p_reservation_room_id
  FOR UPDATE OF rr, r;

  IF current_row.reservation_room_id IS NULL THEN
    RAISE EXCEPTION 'reservation room % not found', p_reservation_room_id USING ERRCODE = 'P0001';
  END IF;

  IF current_row.status IN ('checked_out', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION
      'reservation % with status % cannot be moved from room-rack',
      current_row.reservation_number,
      current_row.status
      USING ERRCODE = 'P0001';
  END IF;

  IF current_row.status = 'checked_in'
     AND p_check_in_date IS DISTINCT FROM current_row.current_check_in_date THEN
    RAISE EXCEPTION
      'checked-in reservation % check-in date cannot be moved from room-rack',
      current_row.reservation_number
      USING ERRCODE = 'P0001';
  END IF;

  SELECT rooms.id, rooms.room_type_id, rooms.status, rooms.room_number
  INTO target_room
  FROM public.rooms rooms
  WHERE rooms.id = p_target_room_id
  FOR UPDATE;

  IF target_room.id IS NULL THEN
    RAISE EXCEPTION 'target room % not found', p_target_room_id USING ERRCODE = 'P0001';
  END IF;

  IF public.room_status_blocks_sales(target_room.status::text) THEN
    RAISE EXCEPTION
      'room % status % does not allow reservation move',
      target_room.room_number,
      target_room.status
      USING ERRCODE = 'P0001';
  END IF;

  -- Беремо те саме транзакційне блокування номера, що й тригери.
  -- Завдяки цьому два одночасні переміщення в один номер виконуються послідовно.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_target_room_id::text, 0));

  SELECT r.reservation_number
  INTO conflicting_reservation_number
  FROM public.reservation_rooms rr
  JOIN public.reservations r ON r.id = rr.reservation_id
  WHERE rr.room_id = p_target_room_id
    AND rr.id IS DISTINCT FROM p_reservation_room_id
    AND r.id IS DISTINCT FROM current_row.reservation_id
    AND public.reservation_status_blocks_inventory(r.status::text)
    AND COALESCE(rr.check_in_time::date, r.check_in_date) < p_check_out_date
    AND COALESCE(rr.check_out_time::date, r.check_out_date) > p_check_in_date
  LIMIT 1;

  IF conflicting_reservation_number IS NOT NULL THEN
    RAISE EXCEPTION
      'room is already reserved by active reservation % for overlapping dates',
      conflicting_reservation_number
      USING ERRCODE = 'P0001';
  END IF;

  -- Прапорець діє лише в поточній транзакції та автоматично скидається
  -- після COMMIT або ROLLBACK. Допоміжні функції тригерів приймають його
  -- лише в контексті власника цієї SECURITY DEFINER-функції.
  PERFORM set_config('app.room_rack_atomic_move', 'on', true);

  -- Старі сценарії могли залишити необов'язкові періоди номерів поза межами
  -- дат батьківського бронювання. Для всіх рядків номерів цього бронювання
  -- скидаємо лише несумісні планові періоди. Фактичні дати й час
  -- actual_check_in та actual_check_out не змінюємо.
  UPDATE public.reservation_rooms rr
  SET
    check_in_time = CASE
      WHEN rr.check_in_time IS NULL AND rr.check_out_time IS NULL THEN NULL
      WHEN COALESCE(rr.check_in_time::date, p_check_in_date) < p_check_in_date
        OR COALESCE(rr.check_out_time::date, p_check_out_date) > p_check_out_date
        OR COALESCE(rr.check_out_time::date, p_check_out_date) <
           COALESCE(rr.check_in_time::date, p_check_in_date)
      THEN NULL
      ELSE rr.check_in_time
    END,
    check_out_time = CASE
      WHEN rr.check_in_time IS NULL AND rr.check_out_time IS NULL THEN NULL
      WHEN COALESCE(rr.check_in_time::date, p_check_in_date) < p_check_in_date
        OR COALESCE(rr.check_out_time::date, p_check_out_date) > p_check_out_date
        OR COALESCE(rr.check_out_time::date, p_check_out_date) <
           COALESCE(rr.check_in_time::date, p_check_in_date)
      THEN NULL
      ELSE rr.check_out_time
    END,
    updated_at = NOW()
  WHERE rr.reservation_id = current_row.reservation_id
    AND (
      COALESCE(rr.check_in_time::date, p_check_in_date) < p_check_in_date
      OR COALESCE(rr.check_out_time::date, p_check_out_date) > p_check_out_date
      OR COALESCE(rr.check_out_time::date, p_check_out_date) <
         COALESCE(rr.check_in_time::date, p_check_in_date)
    );

  UPDATE public.reservations r
  SET
    check_in_date = p_check_in_date,
    check_out_date = p_check_out_date,
    total_amount = ROUND(p_total_amount, 2),
    updated_at = NOW()
  WHERE r.id = current_row.reservation_id;

  UPDATE public.reservation_rooms rr
  SET
    moved_from_room_id = CASE
      WHEN rr.room_id IS DISTINCT FROM p_target_room_id THEN rr.room_id
      ELSE rr.moved_from_room_id
    END,
    room_id = p_target_room_id,
    room_type_id = target_room.room_type_id,
    rate = ROUND(COALESCE(p_rate, current_row.current_rate), 2),
    updated_at = NOW()
  WHERE rr.id = p_reservation_room_id;

  IF EXISTS (
    SELECT 1
    FROM public.reservation_rooms rr
    JOIN public.reservations r ON r.id = rr.reservation_id
    WHERE rr.reservation_id = current_row.reservation_id
      AND (
        COALESCE(rr.check_in_time::date, r.check_in_date) < r.check_in_date
        OR COALESCE(rr.check_out_time::date, r.check_out_date) > r.check_out_date
        OR COALESCE(rr.check_out_time::date, r.check_out_date) <
           COALESCE(rr.check_in_time::date, r.check_in_date)
      )
  ) THEN
    RAISE EXCEPTION
      'reservation % room periods could not be synchronized',
      current_row.reservation_number
      USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT
    rr.id,
    rr.reservation_id,
    rr.room_id,
    rr.room_type_id,
    r.check_in_date,
    r.check_out_date,
    r.total_amount,
    COALESCE(r.paid_amount, 0),
    r.total_amount - COALESCE(r.paid_amount, 0),
    rr.rate
  FROM public.reservation_rooms rr
  JOIN public.reservations r ON r.id = rr.reservation_id
  WHERE rr.id = p_reservation_room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_room_rack_reservation_room(uuid, uuid, date, date, numeric, numeric) FROM PUBLIC;

-- У проєктах Supabase зазвичай існує роль authenticated. Ця перевірка дозволяє
-- виконувати скрипт і в локальних або не-Supabase базах, де такої ролі ще немає.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.move_room_rack_reservation_room(uuid, uuid, date, date, numeric, numeric) TO authenticated';
  END IF;
END;
$$;
