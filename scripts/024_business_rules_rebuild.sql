-- Canonical business rules BR-01..BR-26.
-- Supersedes legacy lifecycle/payment triggers and migration 023.
-- Apply after 019-021. Migration 022 is read-only.

-- The application and BR-09 use `inspected`, while older databases only had
-- the intermediate `inspecting` status.
ALTER TYPE public.room_status ADD VALUE IF NOT EXISTS 'inspected';

BEGIN;

-- Fail early when this script is applied to an incompatible schema.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'users', 'guests', 'rate_plans', 'room_types', 'rooms',
    'reservations', 'reservation_rooms', 'payments', 'folios',
    'folio_charges', 'hotel_settings', 'housekeeping_tasks',
    'maintenance_requests', 'notifications', 'audit_logs',
    'inventory_items', 'inventory_transactions'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE EXCEPTION 'Required table public.% is missing', v_table;
    END IF;
  END LOOP;

  IF to_regprocedure('public.fn_clean_text(text)') IS NULL
     OR to_regprocedure('public.fn_is_valid_email(text)') IS NULL
     OR to_regprocedure('public.fn_reservation_net_paid(uuid)') IS NULL
     OR to_regprocedure('public.sync_finance_totals(uuid)') IS NULL THEN
    RAISE EXCEPTION
      'Required foundation/finance functions are missing; apply 000 and 019 first';
  END IF;
END;
$$;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.rate_plans WHERE is_default) > 1 THEN
    RAISE EXCEPTION 'More than one default rate plan exists; resolve BR-03 first';
  END IF;

  IF EXISTS (
    SELECT lower(btrim(code))
    FROM public.room_types
    GROUP BY lower(btrim(code))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate room type codes exist; resolve BR-04 first';
  END IF;

  IF EXISTS (
    SELECT lower(btrim(room_number))
    FROM public.rooms
    GROUP BY lower(btrim(room_number))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate room numbers exist; resolve BR-05 first';
  END IF;

  IF EXISTS (
    SELECT reservation_id, room_id
    FROM public.reservation_rooms
    WHERE room_id IS NOT NULL
    GROUP BY reservation_id, room_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate room assignments exist within a reservation; resolve BR-16 first';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- BR-01: users
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT lower(btrim(email))
    FROM public.users
    GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate user emails exist; resolve them before BR-01';
  END IF;

  IF EXISTS (
    SELECT upper(btrim(employee_id))
    FROM public.users
    GROUP BY upper(btrim(employee_id))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate employee IDs exist; resolve them before BR-01';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_ci
  ON public.users (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_employee_id_ci
  ON public.users (upper(employee_id));

CREATE OR REPLACE FUNCTION public.trg_users_normalize_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_employee_number integer;
BEGIN
  NEW.first_name := public.fn_clean_text(NEW.first_name);
  NEW.last_name := public.fn_clean_text(NEW.last_name);
  NEW.email := lower(public.fn_clean_text(NEW.email));
  NEW.phone := public.fn_clean_text(NEW.phone);
  NEW.employee_id := upper(public.fn_clean_text(NEW.employee_id));
  NEW.department := public.fn_clean_text(NEW.department);
  NEW.position := public.fn_clean_text(NEW.position);

  IF NEW.employee_id IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('users.employee_id', 0));

    SELECT COALESCE(max(substring(employee_id FROM 4)::integer), 0) + 1
    INTO v_next_employee_number
    FROM public.users
    WHERE employee_id ~ '^EMP[0-9]{3}$';

    IF v_next_employee_number > 999 THEN
      RAISE EXCEPTION 'Employee ID sequence EMP001..EMP999 is exhausted';
    END IF;

    NEW.employee_id := 'EMP' || lpad(v_next_employee_number::text, 3, '0');
  END IF;

  IF NEW.first_name IS NULL OR NEW.last_name IS NULL THEN
    RAISE EXCEPTION 'User first name and last name are required'
      USING ERRCODE = '23514';
  END IF;

  IF NOT public.fn_is_valid_email(NEW.email) OR NEW.email IS NULL THEN
    RAISE EXCEPTION 'Invalid user email format' USING ERRCODE = '23514';
  END IF;

  IF NEW.employee_id !~ '^EMP[0-9]{3}$' THEN
    RAISE EXCEPTION 'employee_id must match EMP001 format'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_normalize_validate ON public.users;
CREATE TRIGGER trg_users_normalize_validate
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_users_normalize_validate();

-- ---------------------------------------------------------------------------
-- BR-02: guests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_guests_normalize_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.first_name := public.fn_clean_text(NEW.first_name);
  NEW.last_name := public.fn_clean_text(NEW.last_name);
  NEW.email := lower(public.fn_clean_text(NEW.email));
  NEW.phone := public.fn_clean_text(NEW.phone);
  NEW.passport_number := upper(public.fn_clean_text(NEW.passport_number));
  NEW.id_number := upper(public.fn_clean_text(NEW.id_number));
  NEW.nationality := public.fn_clean_text(NEW.nationality);
  NEW.city := public.fn_clean_text(NEW.city);
  NEW.country := public.fn_clean_text(NEW.country);
  NEW.postal_code := public.fn_clean_text(NEW.postal_code);
  NEW.company := public.fn_clean_text(NEW.company);
  NEW.loyalty_tier := public.fn_clean_text(NEW.loyalty_tier);

  IF NEW.first_name IS NULL OR NEW.last_name IS NULL THEN
    RAISE EXCEPTION 'Guest first name and last name are required'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.email IS NULL AND NEW.phone IS NULL THEN
    RAISE EXCEPTION 'Guest requires an email or phone'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.passport_number IS NULL AND NEW.id_number IS NULL THEN
    RAISE EXCEPTION 'Guest requires a passport or national ID'
      USING ERRCODE = '23514';
  END IF;

  IF NOT public.fn_is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid guest email format' USING ERRCODE = '23514';
  END IF;

  IF NEW.date_of_birth > current_date THEN
    RAISE EXCEPTION 'Guest date of birth cannot be in the future'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guests_normalize_validate ON public.guests;
CREATE TRIGGER trg_guests_normalize_validate
  BEFORE INSERT OR UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_guests_normalize_validate();

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_passport_number_unique
  ON public.guests (passport_number)
  WHERE passport_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_id_number_unique
  ON public.guests (id_number)
  WHERE id_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- BR-03..BR-05: rates and rooms
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS ux_rate_plans_one_default
  ON public.rate_plans ((1))
  WHERE is_default = true;

CREATE UNIQUE INDEX IF NOT EXISTS ux_room_types_code_ci
  ON public.room_types (lower(code));

CREATE UNIQUE INDEX IF NOT EXISTS ux_rooms_room_number_ci
  ON public.rooms (lower(room_number));

CREATE OR REPLACE FUNCTION public.trg_room_types_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.name := public.fn_clean_text(NEW.name);
  NEW.code := upper(public.fn_clean_text(NEW.code));

  IF NEW.name IS NULL OR NEW.code IS NULL THEN
    RAISE EXCEPTION 'Room type name and code are required'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.base_occupancy < 1
     OR NEW.max_occupancy < NEW.base_occupancy
     OR NEW.base_rate < 0
     OR (NEW.size_sqm IS NOT NULL AND NEW.size_sqm <= 0) THEN
    RAISE EXCEPTION 'Invalid room type occupancy, rate or size'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_types_validate ON public.room_types;
CREATE TRIGGER trg_room_types_validate
  BEFORE INSERT OR UPDATE ON public.room_types
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_room_types_validate();

CREATE OR REPLACE FUNCTION public.trg_rooms_normalize_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.room_number := upper(public.fn_clean_text(NEW.room_number));

  IF NEW.room_number IS NULL OR NEW.room_type_id IS NULL THEN
    RAISE EXCEPTION 'Room number and room type are required'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rooms_normalize_validate ON public.rooms;
CREATE TRIGGER trg_rooms_normalize_validate
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rooms_normalize_validate();

-- ---------------------------------------------------------------------------
-- BR-06..BR-12, BR-16..BR-17: reservation lifecycle and payments
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reservation_required_prepayment(
  p_total_amount numeric
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(hs.prepayment_required, true) = false THEN 0::numeric
    ELSE round(
      GREATEST(COALESCE(p_total_amount, 0), 0)
      * COALESCE(hs.prepayment_percent, 10)
      / 100,
      2
    )
  END
  FROM (SELECT 1) fallback
  LEFT JOIN public.hotel_settings hs ON hs.id = 1;
$$;

CREATE OR REPLACE FUNCTION public.reservation_transition_allowed(
  p_old_status text,
  p_new_status text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_old_status = p_new_status THEN true
    WHEN p_old_status = 'pending'
      AND p_new_status IN ('confirmed', 'cancelled', 'no_show') THEN true
    WHEN p_old_status = 'confirmed'
      AND p_new_status IN ('checked_in', 'cancelled', 'no_show') THEN true
    WHEN p_old_status = 'checked_in'
      AND p_new_status = 'checked_out' THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.reservation_folio_balance(
  p_reservation_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT round(
    COALESCE((
      SELECT SUM(fc.amount * COALESCE(fc.quantity, 1))
      FROM public.folios f
      JOIN public.folio_charges fc ON fc.folio_id = f.id
      WHERE f.reservation_id = p_reservation_id
        AND COALESCE(fc.charge_status, 'confirmed') = 'confirmed'
    ), 0)
    - COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.reservation_id = p_reservation_id
        AND p.transaction_type = 'payment'
        AND p.payment_status::text = 'paid'
    ), 0)
    + COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.reservation_id = p_reservation_id
        AND p.transaction_type = 'refund'
        AND p.payment_status::text = 'refunded'
    ), 0),
    2
  );
$$;

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

  SELECT rr.id, rooms.room_number, rooms.status
  INTO v_invalid_room
  FROM public.reservation_rooms rr
  LEFT JOIN public.rooms rooms ON rooms.id = rr.room_id
  WHERE rr.reservation_id = p_reservation_id
    AND (
      rr.room_id IS NULL
      OR rooms.id IS NULL
      OR NOT public.room_status_ready_for_check_in(rooms.status::text)
    )
  LIMIT 1;

  IF v_invalid_room.id IS NOT NULL THEN
    RAISE EXCEPTION
      'Check-in requires every assigned room to be available or inspected; room %, status %',
      COALESCE(v_invalid_room.room_number, 'not assigned'),
      COALESCE(v_invalid_room.status::text, 'missing')
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_late_check_in_is_allowed()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rpc_owner name;
BEGIN
  IF current_setting('app.manager_late_check_in', true) IS DISTINCT FROM 'on' THEN
    RETURN false;
  END IF;

  SELECT pg_get_userbyid(p.proowner)
  INTO v_rpc_owner
  FROM pg_proc p
  WHERE p.oid = to_regprocedure(
    'public.manager_late_check_in_reservation(uuid,text)'
  );

  RETURN v_rpc_owner IS NOT NULL AND current_user = v_rpc_owner;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_reservations_canonical_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_new_status text;
  v_net_paid numeric;
  v_folio_balance numeric;
  v_required_prepayment numeric;
  v_requires_core_validation boolean;
BEGIN
  NEW.reservation_number := public.fn_clean_text(NEW.reservation_number);
  NEW.special_requests := public.fn_clean_text(NEW.special_requests);
  NEW.notes := public.fn_clean_text(NEW.notes);

  IF NEW.reservation_number IS NULL THEN
    NEW.reservation_number := public.fn_generate_document_number(
      'RES-',
      'public.reservations'::regclass,
      'reservation_number'
    );
  END IF;

  -- Historical rows may predate BR-06. Unrelated maintenance updates, such as
  -- synchronizing paid_amount, must remain possible so the migration can
  -- repair finance totals. Full validation is still mandatory when creating a
  -- reservation, changing its core fields or moving it through its lifecycle.
  IF TG_OP = 'INSERT' THEN
    v_requires_core_validation := true;
  ELSE
    v_requires_core_validation :=
      NEW.status IS DISTINCT FROM OLD.status
      OR NEW.guest_id IS DISTINCT FROM OLD.guest_id
      OR NEW.rate_plan_id IS DISTINCT FROM OLD.rate_plan_id
      OR NEW.check_in_date IS DISTINCT FROM OLD.check_in_date
      OR NEW.check_out_date IS DISTINCT FROM OLD.check_out_date
      OR NEW.adults IS DISTINCT FROM OLD.adults
      OR NEW.children IS DISTINCT FROM OLD.children
      OR NEW.total_amount IS DISTINCT FROM OLD.total_amount;
  END IF;

  IF v_requires_core_validation THEN
    IF NEW.guest_id IS NULL OR NEW.rate_plan_id IS NULL THEN
      RAISE EXCEPTION 'Reservation requires a guest and rate plan'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.check_in_date IS NULL
       OR NEW.check_out_date IS NULL
       OR NEW.check_out_date <= NEW.check_in_date THEN
      RAISE EXCEPTION 'Reservation check-out must be after check-in'
        USING ERRCODE = '23514';
    END IF;

    IF COALESCE(NEW.adults, 0) < 1
       OR COALESCE(NEW.children, 0) < 0
       OR COALESCE(NEW.total_amount, 0) < 0 THEN
      RAISE EXCEPTION 'Invalid guest count or reservation amount'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.paid_amount := 0;

    IF NEW.status::text = 'pending'
       AND public.reservation_required_prepayment(NEW.total_amount) <= 0.01 THEN
      NEW.status := 'confirmed';
    END IF;

    IF NEW.status::text = 'confirmed'
       AND public.reservation_required_prepayment(NEW.total_amount) > 0.01 THEN
      RAISE EXCEPTION
        'A new reservation requiring prepayment must start as pending'
        USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
  END IF;

  v_old_status := OLD.status::text;
  v_new_status := NEW.status::text;
  v_net_paid := public.fn_reservation_net_paid(NEW.id);
  NEW.paid_amount := GREATEST(v_net_paid, 0);

  IF NOT public.reservation_transition_allowed(v_old_status, v_new_status) THEN
    RAISE EXCEPTION 'Invalid reservation transition: % -> %',
      v_old_status, v_new_status
      USING ERRCODE = '23514';
  END IF;

  IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status = 'confirmed' THEN
    v_required_prepayment :=
      public.reservation_required_prepayment(NEW.total_amount);

    IF v_net_paid + 0.01 < v_required_prepayment THEN
      RAISE EXCEPTION
        'Reservation requires prepayment %; settled amount is %',
        v_required_prepayment,
        v_net_paid
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status = 'checked_in' THEN
    PERFORM public.fn_validate_reservation_checkin(NEW.id);

    IF current_date > NEW.check_out_date THEN
      RAISE EXCEPTION 'Cannot check in after the reservation stay has ended'
        USING ERRCODE = '23514';
    END IF;

    IF current_date = NEW.check_out_date
       AND NOT public.manager_late_check_in_is_allowed() THEN
      RAISE EXCEPTION
        'Check-in on the departure date requires the manager late check-in action'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status = 'checked_out' THEN
    v_folio_balance := public.reservation_folio_balance(NEW.id);

    IF v_folio_balance > 0.01 THEN
      RAISE EXCEPTION 'Cannot check out with unpaid balance %',
        v_folio_balance
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status = 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;

  IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status = 'no_show' THEN
    IF public.fn_clean_text(NEW.no_show_reason) IS NULL THEN
      RAISE EXCEPTION 'No-show reason is required' USING ERRCODE = '23514';
    END IF;
    NEW.no_show_at := COALESCE(NEW.no_show_at, now());
    NEW.no_show_by := COALESCE(NEW.no_show_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_validate_lifecycle ON public.reservations;
DROP TRIGGER IF EXISTS trg_reservations_guard_dates_finance ON public.reservations;
DROP TRIGGER IF EXISTS guard_reservation_check_in_room_status_before_update ON public.reservations;
DROP TRIGGER IF EXISTS trg_reservations_canonical_lifecycle ON public.reservations;
CREATE TRIGGER trg_reservations_canonical_lifecycle
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_reservations_canonical_lifecycle();

CREATE OR REPLACE FUNCTION public.manager_late_check_in_reservation(
  p_reservation_id uuid,
  p_reason text
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations;
  v_net_paid numeric;
  v_check_in_time time;
  v_role text;
BEGIN
  v_role := public.finance_current_role();

  IF v_role NOT IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager'
  ) THEN
    RAISE EXCEPTION 'Only a manager can record a late check-in'
      USING ERRCODE = '42501';
  END IF;

  IF public.fn_clean_text(p_reason) IS NULL THEN
    RAISE EXCEPTION 'Late check-in reason is required'
      USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_reservation.id IS NULL
     OR v_reservation.status::text <> 'confirmed' THEN
    RAISE EXCEPTION 'Late check-in requires a confirmed reservation'
      USING ERRCODE = '23514';
  END IF;

  IF current_date <> v_reservation.check_out_date THEN
    RAISE EXCEPTION
      'Late check-in is available only on the reservation departure date'
      USING ERRCODE = '23514';
  END IF;

  v_net_paid := public.fn_reservation_net_paid(v_reservation.id);
  IF v_net_paid + 0.01 < v_reservation.total_amount THEN
    RAISE EXCEPTION 'Late check-in requires full payment'
      USING ERRCODE = '23514';
  END IF;

  PERFORM public.fn_validate_reservation_checkin(v_reservation.id);

  SELECT COALESCE(default_checkin_time, '14:00'::time)
  INTO v_check_in_time
  FROM public.hotel_settings
  WHERE id = 1;

  v_check_in_time := COALESCE(v_check_in_time, '14:00'::time);

  UPDATE public.reservation_rooms
  SET actual_check_in = COALESCE(
    actual_check_in,
    v_reservation.check_in_date::timestamp + v_check_in_time
  )
  WHERE reservation_id = v_reservation.id;

  PERFORM set_config('app.manager_late_check_in', 'on', true);

  UPDATE public.reservations
  SET
    status = 'checked_in',
    notes = concat_ws(
      E'\n',
      NULLIF(notes, ''),
      '[Пізнє заселення] ' || btrim(p_reason)
    )
  WHERE id = v_reservation.id
  RETURNING * INTO v_reservation;

  PERFORM public.finance_write_audit(
    'manager_late_check_in',
    'reservation',
    v_reservation.id,
    jsonb_build_object(
      'reason', btrim(p_reason),
      'planned_check_in', v_reservation.check_in_date,
      'departure_date', v_reservation.check_out_date,
      'net_paid', v_net_paid
    )
  );

  RETURN v_reservation;
END;
$$;

REVOKE ALL ON FUNCTION public.manager_late_check_in_reservation(uuid, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manager_late_check_in_reservation(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.try_auto_confirm_paid_reservation(
  p_reservation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_net_paid numeric;
  v_required_amount numeric;
  v_updated_count integer;
BEGIN
  SELECT *
  INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_reservation.id IS NULL
     OR v_reservation.status::text <> 'pending'
     OR v_reservation.guest_id IS NULL
     OR v_reservation.rate_plan_id IS NULL
     OR v_reservation.check_in_date IS NULL
     OR v_reservation.check_out_date IS NULL
     OR v_reservation.check_out_date <= v_reservation.check_in_date
     OR COALESCE(v_reservation.adults, 0) < 1
     OR COALESCE(v_reservation.children, 0) < 0
     OR COALESCE(v_reservation.total_amount, 0) < 0 THEN
    RETURN false;
  END IF;

  v_net_paid := public.fn_reservation_net_paid(p_reservation_id);
  v_required_amount :=
    public.reservation_required_prepayment(v_reservation.total_amount);

  IF v_net_paid + 0.01 < v_required_amount THEN
    RETURN false;
  END IF;

  UPDATE public.reservations
  SET status = 'confirmed'
  WHERE id = p_reservation_id
    AND status::text = 'pending';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 THEN
    PERFORM public.finance_write_audit(
      'reservation_auto_confirmed',
      'reservation',
      p_reservation_id,
      jsonb_build_object(
        'net_paid', v_net_paid,
        'required_amount', v_required_amount
      )
    );
  END IF;

  RETURN v_updated_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_finance_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
BEGIN
  v_reservation_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.reservation_id
    ELSE NEW.reservation_id
  END;

  PERFORM public.sync_finance_totals(v_reservation_id);

  IF TG_OP = 'UPDATE'
     AND OLD.reservation_id IS DISTINCT FROM NEW.reservation_id THEN
    PERFORM public.sync_finance_totals(OLD.reservation_id);
  END IF;

  IF TG_OP <> 'DELETE' THEN
    PERFORM public.try_auto_confirm_paid_reservation(NEW.reservation_id);
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS sync_reservation_paid_amount_on_payments ON public.payments;
DROP TRIGGER IF EXISTS trg_payments_sync ON public.payments;
DROP TRIGGER IF EXISTS trg_payments_sync_reservation ON public.payments;
DROP TRIGGER IF EXISTS update_folio_on_payment ON public.payments;
DROP TRIGGER IF EXISTS trg_payments_auto_confirm_reservation ON public.payments;
DROP TRIGGER IF EXISTS trg_finance_sync_payment ON public.payments;
CREATE TRIGGER trg_finance_sync_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_finance_from_payment();

DROP FUNCTION IF EXISTS public.auto_confirm_reservation_from_payment();

CREATE OR REPLACE FUNCTION public.trg_reservation_rooms_canonical_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_actual_room_type_id uuid;
  v_parent_check_in date;
  v_parent_check_out date;
  v_effective_check_in date;
  v_effective_check_out date;
BEGIN
  IF NEW.reservation_id IS NULL OR NEW.room_type_id IS NULL THEN
    RAISE EXCEPTION 'reservation_rooms requires reservation_id and room_type_id'
      USING ERRCODE = '23514';
  END IF;

  IF COALESCE(NEW.rate, 0) < 0 THEN
    RAISE EXCEPTION 'reservation_rooms rate cannot be negative'
      USING ERRCODE = '23514';
  END IF;

  SELECT check_in_date, check_out_date
  INTO v_parent_check_in, v_parent_check_out
  FROM public.reservations
  WHERE id = NEW.reservation_id;

  IF v_parent_check_in IS NULL THEN
    RAISE EXCEPTION 'Parent reservation not found' USING ERRCODE = '23503';
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT room_type_id
    INTO v_actual_room_type_id
    FROM public.rooms
    WHERE id = NEW.room_id;

    IF v_actual_room_type_id IS DISTINCT FROM NEW.room_type_id THEN
      RAISE EXCEPTION 'Assigned room type does not match reservation room type'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  v_effective_check_in :=
    COALESCE(NEW.check_in_time::date, v_parent_check_in);
  v_effective_check_out :=
    COALESCE(NEW.check_out_time::date, v_parent_check_out);

  IF v_effective_check_in < v_parent_check_in
     OR v_effective_check_out > v_parent_check_out
     OR v_effective_check_out < v_effective_check_in THEN
    RAISE EXCEPTION 'reservation_rooms period is outside the reservation period'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_reservation_room_period_before_write ON public.reservation_rooms;
DROP TRIGGER IF EXISTS trg_validate_reservation_room_period ON public.reservation_rooms;
DROP TRIGGER IF EXISTS trg_reservation_rooms_canonical_validate ON public.reservation_rooms;
CREATE TRIGGER trg_reservation_rooms_canonical_validate
  BEFORE INSERT OR UPDATE ON public.reservation_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_reservation_rooms_canonical_validate();

CREATE UNIQUE INDEX IF NOT EXISTS ux_reservation_rooms_unique_room_per_reservation
  ON public.reservation_rooms (reservation_id, room_id)
  WHERE room_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- BR-13..BR-15: folios and charges
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_folios_canonical_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.folio_number := public.fn_clean_text(NEW.folio_number);

  IF NEW.folio_number IS NULL THEN
    NEW.folio_number := public.fn_generate_document_number(
      'FOL-',
      'public.folios'::regclass,
      'folio_number'
    );
  END IF;

  IF NEW.reservation_id IS NULL AND NEW.guest_id IS NULL THEN
    RAISE EXCEPTION 'Folio requires a reservation or guest owner'
      USING ERRCODE = '23514';
  END IF;

  IF COALESCE(NEW.total_amount, 0) < 0
     OR COALESCE(NEW.tax_amount, 0) < 0
     OR COALESCE(NEW.discount_amount, 0) < 0 THEN
    RAISE EXCEPTION 'Folio amounts cannot be negative'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.due_date IS NOT NULL AND NEW.due_date < NEW.issued_date::date THEN
    RAISE EXCEPTION 'Folio due date cannot precede issue date'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_folios_validate ON public.folios;
DROP TRIGGER IF EXISTS trg_folios_canonical_validate ON public.folios;
CREATE TRIGGER trg_folios_canonical_validate
  BEFORE INSERT OR UPDATE ON public.folios
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_folios_canonical_validate();

CREATE OR REPLACE FUNCTION public.trg_folio_charges_canonical_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.description := public.fn_clean_text(NEW.description);

  IF NEW.folio_id IS NULL OR NEW.description IS NULL THEN
    RAISE EXCEPTION 'Folio charge requires folio and description'
      USING ERRCODE = '23514';
  END IF;

  IF COALESCE(NEW.quantity, 0) <= 0 THEN
    RAISE EXCEPTION 'Folio charge quantity must be positive'
      USING ERRCODE = '23514';
  END IF;

  -- Negative amounts are reserved for explicit adjustment rows.
  IF NEW.amount < 0 AND NEW.category IS DISTINCT FROM 'adjustment' THEN
    RAISE EXCEPTION 'Only adjustment charges may be negative'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_folio_charges_canonical_validate ON public.folio_charges;
CREATE TRIGGER trg_folio_charges_canonical_validate
  BEFORE INSERT OR UPDATE ON public.folio_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_folio_charges_canonical_validate();

-- ---------------------------------------------------------------------------
-- BR-18: inventory
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_inventory_transactions_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta integer;
  v_new_stock integer;
  v_max_stock integer;
BEGIN
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Inventory transaction quantity must be positive'
      USING ERRCODE = '23514';
  END IF;

  v_delta := CASE
    WHEN NEW.transaction_type IN ('restock', 'adjustment_in') THEN NEW.quantity
    WHEN NEW.transaction_type IN ('consume', 'adjustment_out') THEN -NEW.quantity
    ELSE NULL
  END;

  IF v_delta IS NULL THEN
    RAISE EXCEPTION 'Invalid inventory transaction type %',
      NEW.transaction_type
      USING ERRCODE = '23514';
  END IF;

  SELECT current_stock + v_delta, max_stock
  INTO v_new_stock, v_max_stock
  FROM public.inventory_items
  WHERE id = NEW.item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found' USING ERRCODE = '23503';
  END IF;

  IF v_new_stock < 0 OR (v_max_stock IS NOT NULL AND v_new_stock > v_max_stock) THEN
    RAISE EXCEPTION 'Inventory stock would be outside allowed bounds'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.inventory_items
  SET current_stock = v_new_stock
  WHERE id = NEW.item_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_transactions_apply ON public.inventory_transactions;
CREATE TRIGGER trg_inventory_transactions_apply
  BEFORE INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_inventory_transactions_apply();

-- ---------------------------------------------------------------------------
-- BR-19..BR-23: housekeeping, reservation room effects and maintenance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_housekeeping_tasks_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.started_at IS NOT NULL AND NEW.started_at < NEW.created_at THEN
    RAISE EXCEPTION 'Housekeeping start cannot precede task creation'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NULL THEN
    RAISE EXCEPTION 'Housekeeping completion requires started_at'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.inspected_at IS NOT NULL
     AND (
       NEW.completed_at IS NULL
       OR NEW.inspected_at < NEW.completed_at
     ) THEN
    RAISE EXCEPTION 'Invalid housekeeping inspection metadata'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status::text = 'inspected'
     AND (
       NEW.inspected_at IS NULL
       OR (
         NEW.inspected_by IS NULL
         AND COALESCE(NEW.notes, '') NOT LIKE
           '%[Історична інспекція: виконавець не зафіксований]%'
       )
     ) THEN
    RAISE EXCEPTION 'Inspected housekeeping task requires inspection metadata'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_housekeeping_tasks_validate ON public.housekeeping_tasks;
CREATE TRIGGER trg_housekeeping_tasks_validate
  BEFORE INSERT OR UPDATE ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_housekeeping_tasks_validate();

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
    SET status = 'occupied'
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
    SET status = 'dirty'
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

DROP TRIGGER IF EXISTS trg_reservations_post_status_effects ON public.reservations;
DROP TRIGGER IF EXISTS trg_reservations_room_side_effects ON public.reservations;
CREATE TRIGGER trg_reservations_room_side_effects
  AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_reservations_room_side_effects();

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
    UPDATE public.rooms SET status = 'cleaning'::public.room_status WHERE id = NEW.room_id;
    NEW.started_at := COALESCE(NEW.started_at, now());
  ELSIF NEW.status::text = 'completed' THEN
    UPDATE public.rooms SET status = 'inspecting'::public.room_status WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NEW.status::text = 'inspected' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Housekeeping inspection requires an authenticated inspector'
        USING ERRCODE = '42501';
    END IF;

    UPDATE public.rooms SET status = 'inspected'::public.room_status WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.inspected_at := COALESCE(NEW.inspected_at, now());
    NEW.inspected_by := COALESCE(NEW.inspected_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_housekeeping_tasks_room_side_effects ON public.housekeeping_tasks;
CREATE TRIGGER trg_housekeeping_tasks_room_side_effects
  BEFORE UPDATE OF status ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_housekeeping_tasks_room_side_effects();

CREATE OR REPLACE FUNCTION public.trg_maintenance_requests_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.description := public.fn_clean_text(NEW.description);
  NEW.resolution := public.fn_clean_text(NEW.resolution);

  IF public.fn_clean_text(NEW.request_number) IS NULL
     OR NEW.reported_by IS NULL
     OR NEW.description IS NULL THEN
    RAISE EXCEPTION 'Maintenance request number, reporter and description are required'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;

  IF NEW.started_at IS NOT NULL AND NEW.assigned_to IS NULL THEN
    RAISE EXCEPTION 'Maintenance start requires an assignee'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.completed_at IS NOT NULL
     AND (
       NEW.resolution IS NULL
       OR (NEW.started_at IS NOT NULL AND NEW.completed_at < NEW.started_at)
       OR (NEW.assigned_at IS NOT NULL AND NEW.completed_at < NEW.assigned_at)
     ) THEN
    RAISE EXCEPTION 'Invalid maintenance completion metadata'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_requests_validate ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_requests_validate
  BEFORE INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_maintenance_requests_validate();

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
    UPDATE public.rooms SET status = 'maintenance' WHERE id = NEW.room_id;
  ELSIF NEW.status::text = 'completed'
        AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.rooms SET status = 'dirty' WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_requests_room_side_effects
  ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_requests_room_side_effects
  AFTER INSERT OR UPDATE OF priority, status ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_maintenance_requests_room_side_effects();

-- ---------------------------------------------------------------------------
-- BR-24..BR-26: notifications, audit and updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_notifications_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.is_read, false) THEN
    NEW.read_at := COALESCE(NEW.read_at, now());
  ELSE
    NEW.read_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_validate ON public.notifications;
CREATE TRIGGER trg_notifications_validate
  BEFORE INSERT OR UPDATE OF is_read, read_at ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notifications_validate();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.audit_logs'::regclass
      AND conname = 'ck_audit_logs_action_nonblank'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT ck_audit_logs_action_nonblank
      CHECK (public.fn_clean_text(action::text) IS NOT NULL) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.audit_logs'::regclass
      AND conname = 'ck_audit_logs_entity_pair'
  ) THEN
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT ck_audit_logs_entity_pair CHECK (
        (entity_type IS NULL AND entity_id IS NULL)
        OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)
      ) NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_table text;
  v_trigger record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'users', 'guests', 'rate_plans', 'room_types', 'rooms',
    'reservations', 'reservation_rooms', 'folios', 'hotel_settings',
    'housekeeping_tasks', 'inventory_items', 'maintenance_requests'
  ]
  LOOP
    FOR v_trigger IN
      SELECT t.tgname
      FROM pg_trigger t
      WHERE t.tgrelid = format('public.%I', v_table)::regclass
        AND NOT t.tgisinternal
        AND (
          t.tgname LIKE '%updated_at%'
          OR t.tgname IN (
            'set_profile_updated_at',
            'trg_hotel_settings_touch',
            'touch_updated_at'
          )
        )
    LOOP
      EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON public.%I',
        v_trigger.tgname,
        v_table
      );
    END LOOP;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I',
      v_table
    );
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.fn_set_updated_at()',
      v_table
    );
  END LOOP;
END;
$$;

-- Repair cached finance totals and statuses using the canonical rules.
DO $$
DECLARE
  v_reservation_id uuid;
BEGIN
  FOR v_reservation_id IN
    SELECT id FROM public.reservations ORDER BY id
  LOOP
    PERFORM public.sync_finance_totals(v_reservation_id);
    PERFORM public.try_auto_confirm_paid_reservation(v_reservation_id);
  END LOOP;
END;
$$;

COMMIT;
