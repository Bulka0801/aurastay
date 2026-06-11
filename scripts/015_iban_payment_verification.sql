-- Two-step verification for bank transfers:
-- receipt received -> pending payment; bank statement checked -> paid payment.

CREATE OR REPLACE FUNCTION public.validate_iban_payment_instruction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_method = 'bank_transfer_iban'
     AND NULLIF(BTRIM(NEW.transaction_id), '') IS NULL THEN
    RAISE EXCEPTION 'IBAN payment requires a payment instruction number'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_iban_payment_instruction_on_payments ON public.payments;
CREATE TRIGGER validate_iban_payment_instruction_on_payments
  BEFORE INSERT OR UPDATE OF payment_method, transaction_id ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_iban_payment_instruction();

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

CREATE OR REPLACE FUNCTION public.confirm_iban_payment(p_payment_id uuid)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments;
  v_role text;
BEGIN
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role IS NULL OR v_role NOT IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager',
    'front_desk_agent',
    'accountant'
  ) THEN
    RAISE EXCEPTION 'Not authorized to confirm IBAN payments'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.payments
  SET
    payment_status = 'paid',
    payment_date = NOW(),
    notes = CONCAT_WS(E'\n', NULLIF(notes, ''), 'Зарахування підтверджено за випискою.')
  WHERE id = p_payment_id
    AND payment_method = 'bank_transfer_iban'
    AND payment_status = 'pending'
  RETURNING * INTO v_payment;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Pending IBAN payment not found';
  END IF;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_iban_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_iban_payment(uuid) TO authenticated;

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
  IF NEW.status NOT IN ('cancelled', 'no_show')
     OR OLD.status IN ('cancelled', 'no_show') THEN
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

  SELECT COALESCE(SUM(
    CASE
      WHEN p.payment_status = 'refunded' THEN -ABS(p.amount)
      WHEN p.payment_status IN ('paid', 'partial') THEN p.amount
      ELSE 0
    END
  ), 0)
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

UPDATE public.reservations r
SET paid_amount = COALESCE((
  SELECT SUM(
    CASE
      WHEN p.payment_status = 'refunded' THEN -ABS(p.amount)
      WHEN p.payment_status IN ('paid', 'partial') THEN p.amount
      ELSE 0
    END
  )
  FROM public.payments p
  WHERE p.reservation_id = r.id
), 0);
