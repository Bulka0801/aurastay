-- НОВА ЛОГІКА З 024-027 ЦЕ НЕ АКТУАЛЬНЕ
-- Confirm pending reservations when a settled payment satisfies the configured
-- prepayment threshold. Requires migrations 017-022.

BEGIN;

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
  v_prepayment_required boolean;
  v_prepayment_percent numeric;
  v_required_amount numeric;
  v_net_paid numeric;
  v_updated_count integer;
BEGIN
  IF p_reservation_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
  INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_reservation.id IS NULL OR v_reservation.status::text <> 'pending' THEN
    RETURN false;
  END IF;

  SELECT prepayment_required, prepayment_percent
  INTO v_prepayment_required, v_prepayment_percent
  FROM public.hotel_settings
  WHERE id = 1;

  IF NOT FOUND THEN
    v_prepayment_required := true;
    v_prepayment_percent := 10;
  END IF;

  v_net_paid := public.fn_reservation_net_paid(p_reservation_id);
  v_required_amount := CASE
    WHEN v_prepayment_required THEN
      round(
        COALESCE(v_reservation.total_amount, 0)
        * COALESCE(v_prepayment_percent, 10)
        / 100,
        2
      )
    ELSE 0
  END;

  IF v_net_paid + 0.01 < v_required_amount THEN
    RETURN false;
  END IF;

  UPDATE public.reservations
  SET
    status = 'confirmed',
    updated_at = now()
  WHERE id = p_reservation_id
    AND status::text = 'pending';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count > 0 AND auth.uid() IS NOT NULL THEN
    PERFORM public.finance_write_audit(
      'reservation_auto_confirmed_after_payment',
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

REVOKE ALL ON FUNCTION public.try_auto_confirm_paid_reservation(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.auto_confirm_reservation_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_type = 'payment'
     AND NEW.payment_status::text = 'paid'
     AND (
       TG_OP = 'INSERT'
       OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
     ) THEN
    PERFORM public.try_auto_confirm_paid_reservation(NEW.reservation_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_auto_confirm_reservation
  ON public.payments;
CREATE TRIGGER trg_payments_auto_confirm_reservation
  AFTER INSERT OR UPDATE OF payment_status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_reservation_from_payment();

-- Repair pending reservations whose historical settled payments already meet
-- the same threshold. This is idempotent: confirmed rows are skipped.
DO $$
DECLARE
  v_reservation_id uuid;
BEGIN
  FOR v_reservation_id IN
    SELECT id
    FROM public.reservations
    WHERE status::text = 'pending'
    ORDER BY id
  LOOP
    PERFORM public.try_auto_confirm_paid_reservation(v_reservation_id);
  END LOOP;
END;
$$;

COMMIT;

-- Expected for RES54579114 after this migration: status = confirmed when its
-- settled payment meets the configured threshold.
SELECT
  r.reservation_number,
  r.status,
  r.total_amount,
  r.paid_amount,
  public.fn_reservation_net_paid(r.id) AS calculated_paid
FROM public.reservations r
WHERE r.reservation_number = 'RES54579114';
