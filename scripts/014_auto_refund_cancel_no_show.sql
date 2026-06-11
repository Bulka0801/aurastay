-- Automatically settle reservation finances when a reservation becomes
-- cancelled or no_show.
--
-- Policy implemented here:
-- - keep reservations.total_amount unchanged for historical reporting;
-- - create a refunded payment for the current net paid amount;
-- - create a negative folio charge that reverses outstanding folio charges;
-- - mark the folio as refunded when money was returned, otherwise paid.
--
-- This trigger only runs on a transition into cancelled/no_show, so editing
-- other fields on an already-cancelled reservation will not duplicate rows.
--
-- RLS note: this function is SECURITY DEFINER. In Supabase, create/apply it
-- as a role that owns the target tables or has BYPASSRLS, unless the tables
-- use FORCE ROW LEVEL SECURITY.

CREATE OR REPLACE FUNCTION public.auto_refund_on_cancel_or_no_show()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id uuid;
  v_net_paid numeric := 0;
  v_total_charges numeric := 0;
  v_refund_transaction_id text := 'AUTO_REFUND_CANCEL_' || NEW.id::text;
BEGIN
  IF NEW.status NOT IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  SELECT f.id
  INTO v_folio_id
  FROM public.folios f
  WHERE f.reservation_id = NEW.id
  ORDER BY f.created_at DESC
  LIMIT 1
  FOR UPDATE;

  PERFORM 1
  FROM public.payments p
  WHERE p.reservation_id = NEW.id
  FOR UPDATE;

  SELECT COALESCE(
    SUM(
      CASE
        WHEN p.payment_status = 'refunded' THEN -ABS(p.amount)
        WHEN p.payment_status IN ('paid', 'partial') THEN p.amount
        ELSE 0
      END
    ),
    0
  )
  INTO v_net_paid
  FROM public.payments p
  WHERE p.reservation_id = NEW.id;

  IF v_net_paid > 0 THEN
    INSERT INTO public.payments (
      reservation_id,
      folio_id,
      amount,
      payment_method,
      payment_status,
      transaction_id,
      notes
    )
    SELECT
      NEW.id,
      v_folio_id,
      v_net_paid,
      'cash',
      'refunded',
      v_refund_transaction_id,
      CASE
        WHEN NEW.status = 'no_show' THEN 'Автоматичне повернення передоплати при no-show'
        ELSE 'Автоматичне повернення передоплати при скасуванні'
      END
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.payments existing_payment
      WHERE existing_payment.transaction_id = v_refund_transaction_id
    );
  END IF;

  IF v_folio_id IS NOT NULL THEN
    SELECT COALESCE(SUM(fc.amount * COALESCE(fc.quantity, 1)), 0)
    INTO v_total_charges
    FROM public.folio_charges fc
    WHERE fc.folio_id = v_folio_id;

    IF v_total_charges > 0 THEN
      INSERT INTO public.folio_charges (
        folio_id,
        description,
        amount,
        quantity,
        charge_date,
        category
      )
      VALUES (
        v_folio_id,
        CASE
          WHEN NEW.status = 'no_show' THEN 'Коригування нарахувань через no-show'
          ELSE 'Коригування нарахувань через скасування'
        END,
        -v_total_charges,
        1,
        CURRENT_DATE,
        'adjustment'
      );
    END IF;

    UPDATE public.folios
    SET
      status = CASE WHEN v_net_paid > 0 THEN 'refunded'::payment_status ELSE 'paid'::payment_status END,
      updated_at = NOW()
    WHERE id = v_folio_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_auto_refund ON public.reservations;
CREATE TRIGGER trg_reservations_auto_refund
  AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW
  WHEN (
    NEW.status IN ('cancelled', 'no_show')
    AND OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION public.auto_refund_on_cancel_or_no_show();
