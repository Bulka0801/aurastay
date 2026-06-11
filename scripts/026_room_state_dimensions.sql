-- Split rooms.status into independent occupancy, housekeeping and operational
-- dimensions while keeping rooms.status as a temporary compatibility projection.
-- Apply after 024_business_rules_rebuild.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'room_occupancy_status'
  ) THEN
    CREATE TYPE public.room_occupancy_status AS ENUM ('vacant', 'occupied');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'room_housekeeping_status'
  ) THEN
    CREATE TYPE public.room_housekeeping_status AS ENUM (
      'clean',
      'dirty',
      'cleaning',
      'inspecting',
      'inspected'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'room_operational_status'
  ) THEN
    CREATE TYPE public.room_operational_status AS ENUM (
      'operational',
      'maintenance',
      'out_of_order',
      'blocked'
    );
  END IF;
END;
$$;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS occupancy_status public.room_occupancy_status,
  ADD COLUMN IF NOT EXISTS housekeeping_status public.room_housekeeping_status,
  ADD COLUMN IF NOT EXISTS operational_status public.room_operational_status;

UPDATE public.rooms AS rooms
SET
  occupancy_status = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.reservation_rooms rr
      JOIN public.reservations r ON r.id = rr.reservation_id
      WHERE rr.room_id = rooms.id
        AND r.status::text = 'checked_in'
    ) THEN 'occupied'::public.room_occupancy_status
    WHEN status::text = 'occupied' THEN 'occupied'::public.room_occupancy_status
    ELSE 'vacant'::public.room_occupancy_status
  END,
  housekeeping_status = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.reservation_rooms rr
      JOIN public.reservations r ON r.id = rr.reservation_id
      WHERE rr.room_id = rooms.id
        AND r.status::text = 'checked_in'
    ) THEN 'clean'::public.room_housekeeping_status
    ELSE CASE status::text
      WHEN 'occupied' THEN 'clean'::public.room_housekeeping_status
      WHEN 'dirty' THEN 'dirty'::public.room_housekeeping_status
      WHEN 'cleaning' THEN 'cleaning'::public.room_housekeeping_status
      WHEN 'inspecting' THEN 'inspecting'::public.room_housekeeping_status
      WHEN 'inspected' THEN 'inspected'::public.room_housekeeping_status
      WHEN 'available' THEN 'inspected'::public.room_housekeeping_status
      ELSE 'dirty'::public.room_housekeeping_status
    END
  END,
  operational_status = CASE status::text
    WHEN 'maintenance' THEN 'maintenance'::public.room_operational_status
    WHEN 'out_of_order' THEN 'out_of_order'::public.room_operational_status
    WHEN 'blocked' THEN 'blocked'::public.room_operational_status
    ELSE 'operational'::public.room_operational_status
  END
WHERE occupancy_status IS NULL
   OR housekeeping_status IS NULL
   OR operational_status IS NULL;

ALTER TABLE public.rooms
  ALTER COLUMN occupancy_status SET DEFAULT 'vacant',
  ALTER COLUMN occupancy_status SET NOT NULL,
  ALTER COLUMN housekeeping_status SET DEFAULT 'inspected',
  ALTER COLUMN housekeeping_status SET NOT NULL,
  ALTER COLUMN operational_status SET DEFAULT 'operational',
  ALTER COLUMN operational_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_state_dimensions
  ON public.rooms (operational_status, occupancy_status, housekeeping_status);

CREATE OR REPLACE FUNCTION public.room_legacy_status(
  p_occupancy public.room_occupancy_status,
  p_housekeeping public.room_housekeeping_status,
  p_operational public.room_operational_status
)
RETURNS public.room_status
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_operational = 'maintenance' THEN 'maintenance'::public.room_status
    WHEN p_operational = 'out_of_order' THEN 'out_of_order'::public.room_status
    WHEN p_operational = 'blocked' THEN 'blocked'::public.room_status
    WHEN p_occupancy = 'occupied' THEN 'occupied'::public.room_status
    WHEN p_housekeeping = 'dirty' THEN 'dirty'::public.room_status
    WHEN p_housekeeping = 'cleaning' THEN 'cleaning'::public.room_status
    WHEN p_housekeeping = 'inspecting' THEN 'inspecting'::public.room_status
    WHEN p_housekeeping = 'inspected' THEN 'inspected'::public.room_status
    ELSE 'available'::public.room_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.room_is_sellable(
  p_occupancy public.room_occupancy_status,
  p_operational public.room_operational_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_occupancy = 'vacant' AND p_operational = 'operational';
$$;

CREATE OR REPLACE FUNCTION public.room_is_ready_for_check_in(
  p_occupancy public.room_occupancy_status,
  p_housekeeping public.room_housekeeping_status,
  p_operational public.room_operational_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_occupancy = 'vacant'
     AND p_housekeeping IN ('clean', 'inspected')
     AND p_operational = 'operational';
$$;

CREATE OR REPLACE FUNCTION public.trg_rooms_state_dimensions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_legacy_changed boolean;
  v_dimensions_changed boolean;
BEGIN
  v_legacy_changed :=
    TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status;
  v_dimensions_changed :=
    TG_OP = 'UPDATE'
    AND (
      NEW.occupancy_status IS DISTINCT FROM OLD.occupancy_status
      OR NEW.housekeeping_status IS DISTINCT FROM OLD.housekeeping_status
      OR NEW.operational_status IS DISTINCT FROM OLD.operational_status
    );

  -- Translate writes from older clients. Housekeeping and operational writes
  -- preserve the independent dimensions they do not own.
  IF TG_OP = 'INSERT' OR (v_legacy_changed AND NOT v_dimensions_changed) THEN
    CASE NEW.status::text
      WHEN 'available' THEN
        NEW.occupancy_status := 'vacant';
        NEW.housekeeping_status := 'inspected';
        NEW.operational_status := 'operational';
      WHEN 'occupied' THEN
        NEW.occupancy_status := 'occupied';
        NEW.housekeeping_status := 'clean';
        NEW.operational_status := 'operational';
      WHEN 'dirty' THEN
        NEW.occupancy_status := 'vacant';
        NEW.housekeeping_status := 'dirty';
        NEW.operational_status := 'operational';
      WHEN 'cleaning' THEN
        NEW.housekeeping_status := 'cleaning';
      WHEN 'inspecting' THEN
        NEW.housekeeping_status := 'inspecting';
      WHEN 'inspected' THEN
        NEW.housekeeping_status := 'inspected';
      WHEN 'maintenance' THEN
        NEW.operational_status := 'maintenance';
      WHEN 'out_of_order' THEN
        NEW.operational_status := 'out_of_order';
      WHEN 'blocked' THEN
        NEW.operational_status := 'blocked';
    END CASE;
  END IF;

  NEW.occupancy_status := COALESCE(NEW.occupancy_status, 'vacant');
  NEW.housekeeping_status := COALESCE(NEW.housekeeping_status, 'inspected');
  NEW.operational_status := COALESCE(NEW.operational_status, 'operational');
  NEW.status := public.room_legacy_status(
    NEW.occupancy_status,
    NEW.housekeeping_status,
    NEW.operational_status
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rooms_state_dimensions ON public.rooms;
CREATE TRIGGER trg_rooms_state_dimensions
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rooms_state_dimensions();

CREATE OR REPLACE FUNCTION public.fn_validate_reservation_checkin(
  p_reservation_id uuid
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_room_count integer;
  v_invalid_room record;
BEGIN
  SELECT count(*)
  INTO v_room_count
  FROM public.reservation_rooms
  WHERE reservation_id = p_reservation_id;

  IF v_room_count = 0 THEN
    RAISE EXCEPTION 'Check-in requires at least one assigned room'
      USING ERRCODE = '23514';
  END IF;

  SELECT
    rr.id,
    rooms.room_number,
    rooms.occupancy_status,
    rooms.housekeeping_status,
    rooms.operational_status
  INTO v_invalid_room
  FROM public.reservation_rooms rr
  LEFT JOIN public.rooms rooms ON rooms.id = rr.room_id
  WHERE rr.reservation_id = p_reservation_id
    AND (
      rr.room_id IS NULL
      OR rooms.id IS NULL
      OR NOT public.room_is_ready_for_check_in(
        rooms.occupancy_status,
        rooms.housekeeping_status,
        rooms.operational_status
      )
    )
  LIMIT 1;

  IF v_invalid_room.id IS NOT NULL THEN
    RAISE EXCEPTION
      'Room % is not ready: occupancy %, housekeeping %, operational %',
      COALESCE(v_invalid_room.room_number, 'not assigned'),
      COALESCE(v_invalid_room.occupancy_status::text, 'missing'),
      COALESCE(v_invalid_room.housekeeping_status::text, 'missing'),
      COALESCE(v_invalid_room.operational_status::text, 'missing')
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_reservations_room_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status::text = 'checked_in' THEN
    UPDATE public.reservation_rooms
    SET actual_check_in = COALESCE(actual_check_in, now())
    WHERE reservation_id = NEW.id;

    UPDATE public.rooms rooms
    SET
      occupancy_status = 'occupied',
      housekeeping_status = 'clean'
    FROM public.reservation_rooms rr
    WHERE rr.reservation_id = NEW.id
      AND rr.room_id = rooms.id;
  ELSIF NEW.status::text = 'checked_out' THEN
    SELECT NULLIF(concat_ws(' ', g.first_name, g.last_name), '')
    INTO v_guest_name
    FROM public.guests g
    WHERE g.id = NEW.guest_id;

    UPDATE public.reservation_rooms
    SET actual_check_out = COALESCE(actual_check_out, now())
    WHERE reservation_id = NEW.id;

    UPDATE public.rooms rooms
    SET
      occupancy_status = 'vacant',
      housekeeping_status = 'dirty'
    FROM public.reservation_rooms rr
    WHERE rr.reservation_id = NEW.id
      AND rr.room_id = rooms.id;

    INSERT INTO public.housekeeping_tasks (
      room_id,
      task_type,
      priority,
      status,
      scheduled_date,
      notes
    )
    SELECT
      rr.room_id,
      'checkout_cleaning',
      'high',
      'pending',
      current_date,
      'Автоматично створено після check-out бронювання '
        || NEW.reservation_number
        || '. Гість: '
        || COALESCE(v_guest_name, 'не вказано')
        || '.'
    FROM public.reservation_rooms rr
    WHERE rr.reservation_id = NEW.id
      AND rr.room_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.housekeeping_tasks ht
        WHERE ht.room_id = rr.room_id
          AND ht.task_type = 'checkout_cleaning'
          AND ht.status::text IN ('pending', 'assigned', 'in_progress')
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_housekeeping_tasks_room_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.room_id IS NULL OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status::text = 'in_progress' THEN
    UPDATE public.rooms
    SET housekeeping_status = 'cleaning'::public.room_housekeeping_status
    WHERE id = NEW.room_id;
    NEW.started_at := COALESCE(NEW.started_at, now());
  ELSIF NEW.status::text = 'completed' THEN
    UPDATE public.rooms
    SET housekeeping_status = CASE
      WHEN NEW.task_type = 'inspection' THEN 'inspected'::public.room_housekeeping_status
      ELSE 'inspecting'::public.room_housekeeping_status
    END
    WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NEW.status::text = 'inspected' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Housekeeping inspection requires an authenticated inspector'
        USING ERRCODE = '42501';
    END IF;

    UPDATE public.rooms
    SET housekeeping_status = 'inspected'::public.room_housekeeping_status
    WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.inspected_at := COALESCE(NEW.inspected_at, now());
    NEW.inspected_by := COALESCE(NEW.inspected_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_maintenance_requests_room_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.priority IN ('high', 'urgent')
     AND NEW.status::text NOT IN ('completed', 'cancelled') THEN
    UPDATE public.rooms
    SET operational_status = 'maintenance'
    WHERE id = NEW.room_id;
  ELSIF NEW.status::text IN ('completed', 'cancelled')
        AND (
          TG_OP = 'INSERT'
          OR OLD.status IS DISTINCT FROM NEW.status
          OR OLD.priority IS DISTINCT FROM NEW.priority
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.maintenance_requests mr
          WHERE mr.room_id = NEW.room_id
            AND mr.id IS DISTINCT FROM NEW.id
            AND mr.priority IN ('high', 'urgent')
            AND mr.status::text NOT IN ('completed', 'cancelled')
        ) THEN
    UPDATE public.rooms
    SET
      operational_status = 'operational',
      housekeeping_status = CASE
        WHEN NEW.status::text = 'completed' THEN 'dirty'
        ELSE housekeeping_status
      END
    WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Expected-arrival/departure are derived operational markers, not physical
-- occupancy states.
CREATE OR REPLACE VIEW public.v_room_current_state AS
SELECT
  rooms.*,
  EXISTS (
    SELECT 1
    FROM public.reservation_rooms rr
    JOIN public.reservations r ON r.id = rr.reservation_id
    WHERE rr.room_id = rooms.id
      AND r.status::text = 'confirmed'
      AND r.check_in_date = current_date
  ) AS expected_arrival,
  EXISTS (
    SELECT 1
    FROM public.reservation_rooms rr
    JOIN public.reservations r ON r.id = rr.reservation_id
    WHERE rr.room_id = rooms.id
      AND r.status::text = 'checked_in'
      AND r.check_out_date = current_date
  ) AS expected_departure,
  public.room_is_sellable(
    rooms.occupancy_status,
    rooms.operational_status
  ) AS is_sellable,
  public.room_is_ready_for_check_in(
    rooms.occupancy_status,
    rooms.housekeeping_status,
    rooms.operational_status
  ) AS is_ready_for_check_in
FROM public.rooms rooms;
