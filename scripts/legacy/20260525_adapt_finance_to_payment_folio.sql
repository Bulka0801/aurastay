-- Historical legacy migration: adapt finance logic to payments.folio_id.
--
-- This file documents logic that was manually applied before migrations
-- 017-020. Do not run it as part of the current migration sequence.
--
-- Important:
--   - 019_finance_logic.sql replaces fn_reservation_net_paid and the payment
--     synchronization trigger with the canonical transaction_type model.
--   - The legacy net-paid function treats old refunded rows as negative
--     payments and does not support separate refund transactions.
--   - The folio creation function below reflects the historical database
--     shape. A later database change removed grand_total from its INSERT.
--   - fn_validate_reservation_checkin(uuid), hotel_settings, and the folio
--     columns referenced here must already exist for this logic to work.

BEGIN;

CREATE OR REPLACE FUNCTION public.trg_reservations_validate_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_old text := COALESCE(OLD.status::text, '');
  v_new text := NEW.status::text;
  v_net_paid numeric;
  v_prepayment_required boolean;
  v_prepayment_percent numeric;
BEGIN
  SELECT prepayment_required, prepayment_percent
  INTO v_prepayment_required, v_prepayment_percent
  FROM public.hotel_settings
  WHERE id = 1;

  IF NOT FOUND THEN
    v_prepayment_required := true;
    v_prepayment_percent := 10.00;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.reservation_number IS NULL OR btrim(NEW.reservation_number) = '' THEN
      NEW.reservation_number := public.fn_generate_document_number(
        'RES-',
        'public.reservations'::regclass,
        'reservation_number'
      );
    ELSE
      NEW.reservation_number := public.fn_clean_text(NEW.reservation_number);
    END IF;

    NEW.paid_amount := COALESCE(NEW.paid_amount, 0);
    NEW.balance := GREATEST(
      COALESCE(NEW.total_amount, 0) - COALESCE(NEW.paid_amount, 0),
      0
    );
    RETURN NEW;
  END IF;

  v_net_paid := public.fn_reservation_net_paid(NEW.id);
  NEW.paid_amount := GREATEST(v_net_paid, 0);
  NEW.balance := GREATEST(COALESCE(NEW.total_amount, 0) - v_net_paid, 0);

  IF v_old = v_new THEN
    RETURN NEW;
  END IF;

  IF v_old = 'pending' AND v_new IN ('confirmed', 'cancelled', 'no_show') THEN
    NULL;
  ELSIF v_old = 'confirmed' AND v_new IN ('checked_in', 'cancelled', 'no_show') THEN
    NULL;
  ELSIF v_old = 'checked_in' AND v_new = 'checked_out' THEN
    NULL;
  ELSE
    RAISE EXCEPTION
      'Неприпустимий перехід статусу бронювання: % -> %',
      v_old,
      v_new;
  END IF;

  IF v_new = 'confirmed' AND v_prepayment_required THEN
    IF v_net_paid < (
      COALESCE(NEW.total_amount, 0) * v_prepayment_percent / 100
    ) THEN
      RAISE EXCEPTION
        'Бронювання не можна підтвердити: сплачена сума % менша за необхідну передоплату %%% від загальної суми %',
        v_net_paid,
        v_prepayment_percent,
        NEW.total_amount;
    END IF;
  END IF;

  IF v_new = 'checked_in' THEN
    IF v_old <> 'confirmed' THEN
      RAISE EXCEPTION 'Лише підтверджені бронювання можна заселити';
    END IF;
    PERFORM public.fn_validate_reservation_checkin(NEW.id);
  END IF;

  IF v_new = 'checked_out' THEN
    IF v_old <> 'checked_in' THEN
      RAISE EXCEPTION 'Лише заселені бронювання можна виселити';
    END IF;
    IF COALESCE(NEW.balance, 0) > 0 THEN
      RAISE EXCEPTION
        'Неможливо виселити бронювання % з непогашеним залишком %',
        NEW.id,
        NEW.balance;
    END IF;
  END IF;

  IF v_new = 'cancelled' THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reservation_net_paid(
  p_reservation_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN p.payment_status::text IN ('paid', 'partial') THEN p.amount
      WHEN p.payment_status::text = 'refunded' THEN -p.amount
      ELSE 0
    END
  ), 0)
  FROM public.payments p
  WHERE p.reservation_id = p_reservation_id
     OR p.folio_id IN (
       SELECT id
       FROM public.folios
       WHERE reservation_id = p_reservation_id
     );
$$;

UPDATE public.payments p
SET folio_id = f.id
FROM public.folios f
WHERE p.reservation_id = f.reservation_id
  AND p.folio_id IS NULL;

CREATE OR REPLACE FUNCTION public.trg_payments_sync_reservation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_reservation_payment_totals(OLD.reservation_id);
    IF OLD.folio_id IS NOT NULL THEN
      PERFORM public.fn_sync_reservation_payment_totals(
        (SELECT reservation_id FROM public.folios WHERE id = OLD.folio_id)
      );
    END IF;
    RETURN OLD;
  END IF;

  PERFORM public.fn_sync_reservation_payment_totals(NEW.reservation_id);
  IF NEW.folio_id IS NOT NULL
     AND TG_OP = 'UPDATE'
     AND OLD.folio_id IS DISTINCT FROM NEW.folio_id THEN
    PERFORM public.fn_sync_reservation_payment_totals(
      (SELECT reservation_id FROM public.folios WHERE id = OLD.folio_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_sync_reservation ON public.payments;
CREATE TRIGGER trg_payments_sync_reservation
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_payments_sync_reservation();

CREATE OR REPLACE FUNCTION public.trg_reservations_create_folio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.folios
    WHERE reservation_id = NEW.id
  ) THEN
    INSERT INTO public.folios (
      reservation_id,
      guest_id,
      folio_number,
      issued_date,
      total_amount,
      grand_total
    )
    VALUES (
      NEW.id,
      NEW.guest_id,
      public.fn_generate_document_number(
        'FOL-',
        'public.folios'::regclass,
        'folio_number'
      ),
      CURRENT_DATE,
      0,
      0
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_create_folio
  ON public.reservations;
CREATE TRIGGER trg_reservations_create_folio
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.trg_reservations_create_folio();

DROP TRIGGER IF EXISTS trg_reservations_validate_lifecycle
  ON public.reservations;
CREATE TRIGGER trg_reservations_validate_lifecycle
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.trg_reservations_validate_lifecycle();

COMMIT;
