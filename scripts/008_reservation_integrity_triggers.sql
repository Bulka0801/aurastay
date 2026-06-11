-- Reservation integrity guards.
-- Keeps payment totals and room periods consistent even when updates come
-- from different UI flows.

-- 1) Keep reservations.paid_amount in sync with payments.
CREATE OR REPLACE FUNCTION public.recalculate_reservation_paid_amount(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_reservation_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.reservations r
  SET
    paid_amount = COALESCE((
      SELECT SUM(
        CASE
          WHEN p.payment_status = 'refunded' THEN -ABS(p.amount)
          WHEN p.payment_status IN ('paid', 'partial') THEN p.amount
          ELSE 0
        END
      )
      FROM public.payments p
      WHERE p.reservation_id = p_reservation_id
    ), 0),
    updated_at = NOW()
  WHERE r.id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_reservation_paid_amount_from_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_reservation_paid_amount(OLD.reservation_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_reservation_paid_amount(NEW.reservation_id);

  IF TG_OP = 'UPDATE' AND OLD.reservation_id IS DISTINCT FROM NEW.reservation_id THEN
    PERFORM public.recalculate_reservation_paid_amount(OLD.reservation_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_reservation_paid_amount_on_payments ON public.payments;
CREATE TRIGGER sync_reservation_paid_amount_on_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reservation_paid_amount_from_payments();

-- 2) Validate that each reservation_rooms period stays within its reservation.
-- If check_in_time/check_out_time are null, the parent reservation dates are used.
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

DROP TRIGGER IF EXISTS validate_reservation_room_period_before_write ON public.reservation_rooms;
CREATE TRIGGER validate_reservation_room_period_before_write
  BEFORE INSERT OR UPDATE ON public.reservation_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation_room_period();

-- 3) When reservation dates change, clamp child room periods into the new parent
-- range before other validations can observe stale reservation_rooms values.
CREATE OR REPLACE FUNCTION public.clamp_reservation_room_periods_to_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.check_in_date IS DISTINCT FROM OLD.check_in_date
     OR NEW.check_out_date IS DISTINCT FROM OLD.check_out_date THEN
    UPDATE public.reservation_rooms rr
    SET
      check_in_time = CASE
        WHEN rr.check_in_time IS NULL THEN rr.check_in_time
        WHEN rr.check_in_time::date < NEW.check_in_date THEN NEW.check_in_date::timestamp
        ELSE rr.check_in_time
      END,
      check_out_time = CASE
        WHEN rr.check_out_time IS NULL THEN rr.check_out_time
        WHEN rr.check_out_time::date > NEW.check_out_date THEN NEW.check_out_date::timestamp
        ELSE rr.check_out_time
      END,
      updated_at = NOW()
    WHERE rr.reservation_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clamp_reservation_room_periods_before_reservation_update ON public.reservations;
CREATE TRIGGER clamp_reservation_room_periods_before_reservation_update
  BEFORE UPDATE OF check_in_date, check_out_date ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.clamp_reservation_room_periods_to_reservation();

-- Optional one-time repair for historical early check-outs where the UI wrote
-- actual_check_out/total_amount but left reservations.check_out_date planned.
-- Review with SELECT first, then run UPDATE if the preview matches expectations.
--
-- SELECT
--   r.id,
--   r.reservation_number,
--   r.check_in_date,
--   r.check_out_date AS planned_check_out,
--   repair.actual_check_out_date,
--   GREATEST(repair.actual_check_out_date, r.check_in_date + 1) AS suggested_check_out_date,
--   r.total_amount
-- FROM public.reservations r
-- JOIN (
--   SELECT reservation_id, MIN(actual_check_out)::date AS actual_check_out_date
--   FROM public.reservation_rooms
--   WHERE actual_check_out IS NOT NULL
--   GROUP BY reservation_id
-- ) repair ON repair.reservation_id = r.id
-- WHERE r.status = 'checked_out'
--   AND repair.actual_check_out_date < r.check_out_date;
--
-- UPDATE public.reservations r
-- SET check_out_date = GREATEST(repair.actual_check_out_date, r.check_in_date + 1),
--     updated_at = NOW()
-- FROM (
--   SELECT reservation_id, MIN(actual_check_out)::date AS actual_check_out_date
--   FROM public.reservation_rooms
--   WHERE actual_check_out IS NOT NULL
--   GROUP BY reservation_id
-- ) repair
-- WHERE repair.reservation_id = r.id
--   AND r.status = 'checked_out'
--   AND repair.actual_check_out_date < r.check_out_date;
