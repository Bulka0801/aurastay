-- Canonical finance rules, RPCs and access control.
-- Requires 017_finance_schema.sql and a reviewed 018_finance_backfill.sql.

BEGIN;

DROP TRIGGER IF EXISTS trg_reservations_auto_refund ON public.reservations;
DROP TRIGGER IF EXISTS trg_payments_set_folio_id ON public.payments;
DROP TRIGGER IF EXISTS trg_payments_validate ON public.payments;
DROP TRIGGER IF EXISTS validate_iban_payment_instruction_on_payments
  ON public.payments;

ALTER TABLE public.payments
  ALTER COLUMN transaction_type SET DEFAULT 'payment',
  ALTER COLUMN transaction_type SET NOT NULL;

ALTER TABLE public.folio_charges
  ALTER COLUMN charge_status SET DEFAULT 'confirmed',
  ALTER COLUMN charge_status SET NOT NULL,
  ALTER COLUMN category SET DEFAULT 'adjustment',
  ALTER COLUMN category SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE reservation_id IS NULL
       OR folio_id IS NULL
       OR transaction_type NOT IN ('payment', 'refund')
       OR (transaction_type = 'refund' AND parent_payment_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Finance backfill is incomplete; review 018_finance_backfill.sql diagnostics';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.folios
    GROUP BY reservation_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate folios exist for a reservation; resolve them before continuing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments parent
    JOIN public.payments refund ON refund.parent_payment_id = parent.id
    WHERE refund.transaction_type = 'refund'
      AND refund.payment_status::text IN ('pending', 'refunded')
    GROUP BY parent.id, parent.amount
    HAVING SUM(refund.amount) > parent.amount + 0.01
  ) THEN
    RAISE EXCEPTION 'Historical refunds exceed a parent payment; review finance data';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_folios_one_per_reservation
  ON public.folios(reservation_id);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_amount_positive,
  DROP CONSTRAINT IF EXISTS payments_transaction_status_valid,
  DROP CONSTRAINT IF EXISTS payments_parent_shape_valid;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT payments_transaction_status_valid CHECK (
    (transaction_type = 'payment' AND payment_status::text IN ('pending', 'paid', 'failed'))
    OR
    (transaction_type = 'refund' AND payment_status::text IN ('pending', 'refunded', 'failed'))
  ),
  ADD CONSTRAINT payments_parent_shape_valid CHECK (
    (transaction_type = 'payment' AND parent_payment_id IS NULL)
    OR
    (transaction_type = 'refund' AND parent_payment_id IS NOT NULL)
  );

ALTER TABLE public.folio_charges
  DROP CONSTRAINT IF EXISTS folio_charges_status_valid,
  DROP CONSTRAINT IF EXISTS folio_charges_category_valid,
  DROP CONSTRAINT IF EXISTS folio_charges_void_metadata_valid;

ALTER TABLE public.folio_charges
  ADD CONSTRAINT folio_charges_status_valid
    CHECK (charge_status IN ('confirmed', 'voided')),
  ADD CONSTRAINT folio_charges_category_valid
    CHECK (category IN ('accommodation', 'no_show_fee', 'cancellation_fee', 'adjustment')),
  ADD CONSTRAINT folio_charges_void_metadata_valid CHECK (
    charge_status = 'confirmed'
    OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.finance_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE id = auth.uid()
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.finance_is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.finance_current_role() IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager'
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.finance_write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_changes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, changes)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, COALESCE(p_changes, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_finance_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_reservation_id uuid;
  v_parent public.payments;
BEGIN
  NEW.transaction_type := COALESCE(NULLIF(btrim(NEW.transaction_type), ''), 'payment');
  NEW.status_changed_at := COALESCE(NEW.status_changed_at, now());
  NEW.transaction_id := public.fn_clean_text(NEW.transaction_id);
  NEW.card_last_four := public.fn_clean_text(NEW.card_last_four);
  NEW.notes := public.fn_clean_text(NEW.notes);

  IF NEW.payment_method::text <> 'card_terminal' THEN
    NEW.card_last_four := NULL;
  END IF;

  IF NEW.transaction_type = 'payment'
     AND NEW.payment_method::text = 'bank_transfer_iban'
     AND NEW.transaction_id IS NULL THEN
    RAISE EXCEPTION 'IBAN payment requires a payment instruction number'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.folio_id IS NULL AND NEW.reservation_id IS NOT NULL THEN
    SELECT id
    INTO NEW.folio_id
    FROM public.folios
    WHERE reservation_id = NEW.reservation_id
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF NEW.reservation_id IS NULL OR NEW.folio_id IS NULL THEN
    RAISE EXCEPTION 'Payment must belong to a reservation and its folio'
      USING ERRCODE = '23514';
  END IF;

  SELECT reservation_id
  INTO v_folio_reservation_id
  FROM public.folios
  WHERE id = NEW.folio_id;

  IF v_folio_reservation_id IS DISTINCT FROM NEW.reservation_id THEN
    RAISE EXCEPTION 'Payment reservation and folio do not match'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.transaction_type = 'refund' THEN
    SELECT *
    INTO v_parent
    FROM public.payments
    WHERE id = NEW.parent_payment_id;

    IF v_parent.id IS NULL
       OR v_parent.transaction_type <> 'payment'
       OR v_parent.payment_status::text <> 'paid' THEN
      RAISE EXCEPTION 'Refund requires a settled parent payment'
        USING ERRCODE = '23514';
    END IF;

    IF v_parent.reservation_id IS DISTINCT FROM NEW.reservation_id
       OR v_parent.folio_id IS DISTINCT FROM NEW.folio_id THEN
      RAISE EXCEPTION 'Refund and parent payment must belong to the same reservation and folio'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.reservation_id IS DISTINCT FROM OLD.reservation_id
       OR NEW.folio_id IS DISTINCT FROM OLD.folio_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type
       OR NEW.parent_payment_id IS DISTINCT FROM OLD.parent_payment_id THEN
      RAISE EXCEPTION 'Financial transaction identity and amount are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.payment_status::text IN ('paid', 'refunded', 'failed')
       AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Completed financial transaction status is immutable'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      NEW.status_changed_at := now();
      NEW.status_changed_by := COALESCE(NEW.status_changed_by, auth.uid());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_validate_payment ON public.payments;
CREATE TRIGGER trg_finance_validate_payment
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_finance_payment();

CREATE OR REPLACE FUNCTION public.prevent_finance_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Financial records cannot be deleted; use refund, void or adjustment'
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_prevent_delete ON public.payments;
CREATE TRIGGER trg_payments_prevent_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finance_delete();

DROP TRIGGER IF EXISTS trg_folio_charges_prevent_delete ON public.folio_charges;
CREATE TRIGGER trg_folio_charges_prevent_delete
  BEFORE DELETE ON public.folio_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_finance_delete();

CREATE OR REPLACE FUNCTION public.fn_reservation_net_paid(p_reservation_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN p.transaction_type = 'payment' AND p.payment_status::text = 'paid' THEN p.amount
      WHEN p.transaction_type = 'refund' AND p.payment_status::text = 'refunded' THEN -p.amount
      ELSE 0
    END
  ), 0)
  FROM public.payments p
  WHERE p.reservation_id = p_reservation_id;
$$;

CREATE OR REPLACE FUNCTION public.sync_finance_totals(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id uuid;
  v_charges numeric := 0;
  v_payments numeric := 0;
  v_refunds numeric := 0;
  v_pending_payments numeric := 0;
  v_pending_refunds numeric := 0;
  v_balance numeric := 0;
  v_status public.payment_status;
BEGIN
  IF p_reservation_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_folio_id
  FROM public.folios
  WHERE reservation_id = p_reservation_id
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF v_folio_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount * COALESCE(quantity, 1)), 0)
  INTO v_charges
  FROM public.folio_charges
  WHERE folio_id = v_folio_id
    AND charge_status = 'confirmed';

  SELECT
    COALESCE(SUM(amount) FILTER (
      WHERE transaction_type = 'payment' AND payment_status::text = 'paid'
    ), 0),
    COALESCE(SUM(amount) FILTER (
      WHERE transaction_type = 'refund' AND payment_status::text = 'refunded'
    ), 0),
    COALESCE(SUM(amount) FILTER (
      WHERE transaction_type = 'payment' AND payment_status::text = 'pending'
    ), 0),
    COALESCE(SUM(amount) FILTER (
      WHERE transaction_type = 'refund' AND payment_status::text = 'pending'
    ), 0)
  INTO v_payments, v_refunds, v_pending_payments, v_pending_refunds
  FROM public.payments
  WHERE reservation_id = p_reservation_id;

  v_balance := round((v_charges - v_payments + v_refunds)::numeric, 2);

  v_status := CASE
    WHEN v_balance > 0.01 AND v_payments <= 0.01 THEN 'pending'::public.payment_status
    WHEN v_balance > 0.01 THEN 'partial'::public.payment_status
    WHEN v_balance < -0.01 OR v_pending_refunds > 0.01 THEN 'partial'::public.payment_status
    ELSE 'paid'::public.payment_status
  END;

  UPDATE public.folios
  SET
    total_amount = v_charges,
    paid_amount = v_payments - v_refunds,
    balance = v_balance,
    status = v_status,
    is_closed = CASE
      WHEN abs(v_balance) <= 0.01
       AND v_pending_payments <= 0.01
       AND v_pending_refunds <= 0.01
      THEN is_closed
      ELSE false
    END,
    updated_at = now()
  WHERE id = v_folio_id;

  UPDATE public.reservations
  SET paid_amount = GREATEST(v_payments - v_refunds, 0),
      updated_at = now()
  WHERE id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_finance_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_finance_totals(CASE WHEN TG_OP = 'DELETE' THEN OLD.reservation_id ELSE NEW.reservation_id END);
  IF TG_OP = 'UPDATE' AND OLD.reservation_id IS DISTINCT FROM NEW.reservation_id THEN
    PERFORM public.sync_finance_totals(OLD.reservation_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS sync_reservation_paid_amount_on_payments ON public.payments;
DROP TRIGGER IF EXISTS trg_payments_sync_reservation ON public.payments;
DROP TRIGGER IF EXISTS update_folio_on_payment ON public.payments;
DROP TRIGGER IF EXISTS trg_finance_sync_payment ON public.payments;
CREATE TRIGGER trg_finance_sync_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_finance_from_payment();

CREATE OR REPLACE FUNCTION public.sync_finance_from_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id uuid;
BEGIN
  SELECT reservation_id
  INTO v_reservation_id
  FROM public.folios
  WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.folio_id ELSE NEW.folio_id END;

  PERFORM public.sync_finance_totals(v_reservation_id);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS update_folio_on_charge ON public.folio_charges;
DROP TRIGGER IF EXISTS trg_folio_charges_sync_folio ON public.folio_charges;
DROP TRIGGER IF EXISTS trg_finance_sync_charge ON public.folio_charges;
CREATE TRIGGER trg_finance_sync_charge
  AFTER INSERT OR UPDATE OR DELETE ON public.folio_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_finance_from_charge();

CREATE OR REPLACE FUNCTION public.sync_accommodation_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id uuid;
  v_existing_total numeric;
BEGIN
  SELECT id
  INTO v_folio_id
  FROM public.folios
  WHERE reservation_id = NEW.id
  ORDER BY created_at
  LIMIT 1;

  IF v_folio_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount * COALESCE(quantity, 1)), 0)
  INTO v_existing_total
  FROM public.folio_charges
  WHERE folio_id = v_folio_id
    AND category = 'accommodation'
    AND charge_status = 'confirmed';

  IF abs(v_existing_total - COALESCE(NEW.total_amount, 0)) <= 0.01 THEN
    RETURN NEW;
  END IF;

  UPDATE public.folio_charges
  SET
    charge_status = 'voided',
    voided_at = now(),
    voided_by = auth.uid(),
    void_reason = CASE
      WHEN TG_OP = 'INSERT' THEN 'Замінено початковим нарахуванням'
      ELSE 'Змінено вартість бронювання'
    END
  WHERE folio_id = v_folio_id
    AND category = 'accommodation'
    AND charge_status = 'confirmed';

  IF COALESCE(NEW.total_amount, 0) > 0 THEN
    INSERT INTO public.folio_charges (
      folio_id, description, amount, quantity, charge_date, category, charge_status, created_by
    )
    VALUES (
      v_folio_id,
      'Проживання за бронюванням ' || NEW.reservation_number,
      NEW.total_amount,
      1,
      NEW.check_in_date,
      'accommodation',
      'confirmed',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_reservations_create_folio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.folios (
    reservation_id,
    guest_id,
    folio_number,
    issued_date,
    total_amount
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
    0
  )
  ON CONFLICT (reservation_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_create_folio
  ON public.reservations;
CREATE TRIGGER trg_reservations_create_folio
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_reservations_create_folio();

DROP TRIGGER IF EXISTS trg_reservations_sync_accommodation ON public.reservations;
CREATE TRIGGER trg_reservations_sync_accommodation
  AFTER INSERT OR UPDATE OF total_amount ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_accommodation_charge();

CREATE OR REPLACE FUNCTION public.guard_reservation_dates_and_no_show()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status::text = 'checked_in'
     AND current_date >= NEW.check_out_date THEN
    RAISE EXCEPTION 'Cannot check in a reservation whose stay period has ended'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status::text = 'no_show'
     AND NULLIF(btrim(NEW.no_show_reason), '') IS NULL THEN
    RAISE EXCEPTION 'No-show reason is required'
      USING ERRCODE = '23514';
  END IF;

  IF (OLD.check_in_date IS DISTINCT FROM NEW.check_in_date
      OR OLD.check_out_date IS DISTINCT FROM NEW.check_out_date)
     AND OLD.check_out_date < current_date
     AND NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Only a manager can reschedule an expired reservation'
      USING ERRCODE = '42501';
  END IF;

  IF (OLD.check_in_date IS DISTINCT FROM NEW.check_in_date
      OR OLD.check_out_date IS DISTINCT FROM NEW.check_out_date)
     AND OLD.check_out_date < current_date
     AND NULLIF(btrim(NEW.reschedule_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required to reschedule an expired reservation'
      USING ERRCODE = '23514';
  END IF;

  IF (OLD.check_in_date IS DISTINCT FROM NEW.check_in_date
      OR OLD.check_out_date IS DISTINCT FROM NEW.check_out_date) THEN
    NEW.rescheduled_at := now();
    NEW.rescheduled_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_guard_dates_finance ON public.reservations;
CREATE TRIGGER trg_reservations_guard_dates_finance
  BEFORE UPDATE OF status, check_in_date, check_out_date ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_reservation_dates_and_no_show();

CREATE OR REPLACE FUNCTION public.audit_reservation_date_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.check_in_date IS DISTINCT FROM NEW.check_in_date
     OR OLD.check_out_date IS DISTINCT FROM NEW.check_out_date THEN
    PERFORM public.finance_write_audit(
      'reservation_dates_changed',
      'reservation',
      NEW.id,
      jsonb_build_object(
        'old_check_in', OLD.check_in_date,
        'new_check_in', NEW.check_in_date,
        'old_check_out', OLD.check_out_date,
        'new_check_out', NEW.check_out_date,
        'reason', NEW.reschedule_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_audit_date_change ON public.reservations;
CREATE TRIGGER trg_reservations_audit_date_change
  AFTER UPDATE OF check_in_date, check_out_date ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_reservation_date_change();

CREATE OR REPLACE FUNCTION public.confirm_iban_payment(p_payment_id uuid)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to confirm IBAN payments' USING ERRCODE = '42501';
  END IF;

  UPDATE public.payments
  SET
    payment_status = 'paid',
    payment_date = now(),
    status_changed_at = now(),
    status_changed_by = auth.uid(),
    failure_reason = NULL,
    notes = concat_ws(E'\n', NULLIF(notes, ''), 'Зарахування підтверджено за банківською випискою.')
  WHERE id = p_payment_id
    AND transaction_type = 'payment'
    AND payment_method::text = 'bank_transfer_iban'
    AND payment_status::text = 'pending'
  RETURNING * INTO v_payment;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Pending IBAN payment not found';
  END IF;

  PERFORM public.finance_write_audit(
    'iban_payment_confirmed', 'payment', v_payment.id,
    jsonb_build_object('reservation_id', v_payment.reservation_id, 'amount', v_payment.amount)
  );
  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_iban_payment(p_payment_id uuid, p_reason text)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to reject IBAN payments' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Failure reason is required' USING ERRCODE = '23514';
  END IF;

  UPDATE public.payments
  SET
    payment_status = 'failed',
    status_changed_at = now(),
    status_changed_by = auth.uid(),
    failure_reason = btrim(p_reason),
    notes = concat_ws(E'\n', NULLIF(notes, ''), 'Кошти не надійшли: ' || btrim(p_reason))
  WHERE id = p_payment_id
    AND transaction_type = 'payment'
    AND payment_method::text = 'bank_transfer_iban'
    AND payment_status::text = 'pending'
  RETURNING * INTO v_payment;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Pending IBAN payment not found';
  END IF;

  PERFORM public.finance_write_audit(
    'iban_payment_failed', 'payment', v_payment.id,
    jsonb_build_object('reason', btrim(p_reason))
  );
  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_refund(
  p_parent_payment_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method,
  p_reason text,
  p_method_override_reason text DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent public.payments;
  v_refund public.payments;
  v_reserved numeric := 0;
  v_method public.payment_method;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to create refunds' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Refund reason is required' USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO v_parent
  FROM public.payments
  WHERE id = p_parent_payment_id
  FOR UPDATE;

  IF v_parent.id IS NULL
     OR v_parent.transaction_type <> 'payment'
     OR v_parent.payment_status::text <> 'paid' THEN
    RAISE EXCEPTION 'Refund requires a settled parent payment' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_reserved
  FROM public.payments
  WHERE parent_payment_id = v_parent.id
    AND transaction_type = 'refund'
    AND payment_status::text IN ('pending', 'refunded');

  IF p_amount > v_parent.amount - v_reserved + 0.01 THEN
    RAISE EXCEPTION 'Refund exceeds the available parent payment amount'
      USING ERRCODE = '23514';
  END IF;

  v_method := COALESCE(p_payment_method, v_parent.payment_method);
  IF v_method IS DISTINCT FROM v_parent.payment_method
     AND NULLIF(btrim(p_method_override_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required when refund method differs from the payment method'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.payments (
    reservation_id,
    folio_id,
    amount,
    payment_method,
    payment_status,
    transaction_type,
    parent_payment_id,
    notes,
    processed_by,
    status_changed_at,
    status_changed_by,
    refund_method_override_reason
  )
  VALUES (
    v_parent.reservation_id,
    v_parent.folio_id,
    round(p_amount, 2),
    v_method,
    'pending',
    'refund',
    v_parent.id,
    btrim(p_reason),
    auth.uid(),
    now(),
    auth.uid(),
    NULLIF(btrim(p_method_override_reason), '')
  )
  RETURNING * INTO v_refund;

  PERFORM public.finance_write_audit(
    'refund_created', 'payment', v_refund.id,
    jsonb_build_object(
      'parent_payment_id', v_parent.id,
      'amount', v_refund.amount,
      'reason', btrim(p_reason)
    )
  );
  RETURN v_refund;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_refund(p_refund_id uuid)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.payments;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to complete refunds' USING ERRCODE = '42501';
  END IF;

  UPDATE public.payments
  SET
    payment_status = 'refunded',
    payment_date = now(),
    status_changed_at = now(),
    status_changed_by = auth.uid(),
    failure_reason = NULL
  WHERE id = p_refund_id
    AND transaction_type = 'refund'
    AND payment_status::text = 'pending'
  RETURNING * INTO v_refund;

  IF v_refund.id IS NULL THEN
    RAISE EXCEPTION 'Pending refund not found';
  END IF;

  PERFORM public.finance_write_audit(
    'refund_completed', 'payment', v_refund.id,
    jsonb_build_object('amount', v_refund.amount, 'parent_payment_id', v_refund.parent_payment_id)
  );
  RETURN v_refund;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_refund(p_refund_id uuid, p_reason text)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund public.payments;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to fail refunds' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Failure reason is required' USING ERRCODE = '23514';
  END IF;

  UPDATE public.payments
  SET
    payment_status = 'failed',
    status_changed_at = now(),
    status_changed_by = auth.uid(),
    failure_reason = btrim(p_reason)
  WHERE id = p_refund_id
    AND transaction_type = 'refund'
    AND payment_status::text = 'pending'
  RETURNING * INTO v_refund;

  IF v_refund.id IS NULL THEN
    RAISE EXCEPTION 'Pending refund not found';
  END IF;

  PERFORM public.finance_write_audit(
    'refund_failed', 'payment', v_refund.id,
    jsonb_build_object('reason', btrim(p_reason))
  );
  RETURN v_refund;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_reservation_no_show(p_reservation_id uuid, p_reason text)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_reservation public.reservations;
BEGIN
  v_role := public.finance_current_role();
  IF v_role NOT IN (
    'system_administrator',
    'general_manager',
    'front_desk_manager',
    'front_desk_agent'
  ) THEN
    RAISE EXCEPTION 'Not authorized to mark no-show' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'No-show reason is required' USING ERRCODE = '23514';
  END IF;

  UPDATE public.reservations
  SET
    status = 'no_show',
    no_show_at = now(),
    no_show_by = auth.uid(),
    no_show_reason = btrim(p_reason),
    updated_at = now()
  WHERE id = p_reservation_id
    AND status::text = 'confirmed'
    AND check_out_date < current_date
  RETURNING * INTO v_reservation;

  IF v_reservation.id IS NULL THEN
    RAISE EXCEPTION 'Only an expired confirmed reservation can be marked no-show';
  END IF;

  PERFORM public.finance_write_audit(
    'reservation_marked_no_show', 'reservation', v_reservation.id,
    jsonb_build_object('reason', btrim(p_reason))
  );
  RETURN v_reservation;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_reservation_finances(
  p_reservation_id uuid,
  p_decision text,
  p_fee_amount numeric,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations;
  v_folio_id uuid;
  v_fee numeric := 0;
  v_paid numeric := 0;
  v_reserved_refunds numeric := 0;
  v_refund_needed numeric := 0;
  v_available numeric := 0;
  v_piece numeric := 0;
  v_payment record;
  v_category text;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to resolve reservation finances' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Financial resolution reason is required' USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_reservation.id IS NULL
     OR v_reservation.status::text NOT IN ('no_show', 'cancelled') THEN
    RAISE EXCEPTION 'Financial resolution is available only for no-show or cancelled reservations';
  END IF;

  SELECT id
  INTO v_folio_id
  FROM public.folios
  WHERE reservation_id = p_reservation_id
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF p_decision = 'leave_open' THEN
    PERFORM public.finance_write_audit(
      'reservation_finance_left_open', 'reservation', p_reservation_id,
      jsonb_build_object('reason', btrim(p_reason))
    );
    RETURN v_folio_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.folio_charges
    WHERE folio_id = v_folio_id
      AND category IN ('no_show_fee', 'cancellation_fee')
      AND charge_status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Financial resolution has already been recorded for this reservation';
  END IF;

  v_fee := CASE
    WHEN p_decision = 'retain_full' THEN COALESCE(v_reservation.total_amount, 0)
    WHEN p_decision = 'refund_all' THEN 0
    WHEN p_decision IN ('retain_deposit', 'custom_fee') THEN COALESCE(p_fee_amount, 0)
    ELSE -1
  END;

  IF v_fee < 0 OR v_fee > COALESCE(v_reservation.total_amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Invalid financial resolution amount' USING ERRCODE = '22003';
  END IF;

  UPDATE public.folio_charges
  SET
    charge_status = 'voided',
    voided_at = now(),
    voided_by = auth.uid(),
    void_reason = btrim(p_reason)
  WHERE folio_id = v_folio_id
    AND category = 'accommodation'
    AND charge_status = 'confirmed';

  v_category := CASE
    WHEN v_reservation.status::text = 'no_show' THEN 'no_show_fee'
    ELSE 'cancellation_fee'
  END;

  IF v_fee > 0.01 THEN
    INSERT INTO public.folio_charges (
      folio_id, description, amount, quantity, charge_date, category, charge_status, created_by
    )
    VALUES (
      v_folio_id,
      CASE
        WHEN v_category = 'no_show_fee' THEN 'Штраф за неприбуття гостя'
        ELSE 'Штраф за скасування бронювання'
      END,
      round(v_fee, 2),
      1,
      current_date,
      v_category,
      'confirmed',
      auth.uid()
    );
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM public.payments
  WHERE reservation_id = p_reservation_id
    AND transaction_type = 'payment'
    AND payment_status::text = 'paid';

  SELECT COALESCE(SUM(amount), 0)
  INTO v_reserved_refunds
  FROM public.payments
  WHERE reservation_id = p_reservation_id
    AND transaction_type = 'refund'
    AND payment_status::text IN ('pending', 'refunded');

  v_refund_needed := GREATEST(round(v_paid - v_fee - v_reserved_refunds, 2), 0);

  FOR v_payment IN
    SELECT p.*,
      p.amount - COALESCE((
        SELECT SUM(r.amount)
        FROM public.payments r
        WHERE r.parent_payment_id = p.id
          AND r.transaction_type = 'refund'
          AND r.payment_status::text IN ('pending', 'refunded')
      ), 0) AS available_amount
    FROM public.payments p
    WHERE p.reservation_id = v_reservation.id
      AND p.transaction_type = 'payment'
      AND p.payment_status::text = 'paid'
    ORDER BY p.created_at DESC
    FOR UPDATE
  LOOP
    EXIT WHEN v_refund_needed <= 0.01;
    v_available := GREATEST(v_payment.available_amount, 0);
    v_piece := LEAST(v_refund_needed, v_available);

    IF v_piece > 0.01 THEN
      INSERT INTO public.payments (
        reservation_id, folio_id, amount, payment_method, payment_status,
        transaction_type, parent_payment_id, notes, processed_by,
        status_changed_at, status_changed_by
      )
      VALUES (
        p_reservation_id, v_folio_id, round(v_piece, 2), v_payment.payment_method,
        'pending', 'refund', v_payment.id, btrim(p_reason), auth.uid(), now(), auth.uid()
      );
      v_refund_needed := round(v_refund_needed - v_piece, 2);
    END IF;
  END LOOP;

  IF v_refund_needed > 0.01 THEN
    RAISE EXCEPTION 'Not enough refundable settled payments for this resolution';
  END IF;

  PERFORM public.finance_write_audit(
    'reservation_finances_resolved', 'reservation', p_reservation_id,
    jsonb_build_object(
      'decision', p_decision,
      'fee_amount', v_fee,
      'reason', btrim(p_reason)
    )
  );
  RETURN v_folio_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_folio(p_folio_id uuid, p_reason text)
RETURNS public.folios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio public.folios;
  v_pending_count integer;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to close folios' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_folio
  FROM public.folios
  WHERE id = p_folio_id
  FOR UPDATE;

  SELECT count(*)
  INTO v_pending_count
  FROM public.payments
  WHERE folio_id = p_folio_id
    AND payment_status::text = 'pending';

  IF abs(COALESCE(v_folio.balance, 0)) > 0.01 OR v_pending_count > 0 THEN
    RAISE EXCEPTION 'Folio must be balanced and have no pending transactions before closing';
  END IF;

  UPDATE public.folios
  SET is_closed = true, status = 'paid', updated_at = now()
  WHERE id = p_folio_id
  RETURNING * INTO v_folio;

  PERFORM public.finance_write_audit(
    'folio_closed', 'folio', v_folio.id,
    jsonb_build_object('reason', NULLIF(btrim(p_reason), ''))
  );
  RETURN v_folio;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_close_balanced_folio_after_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio_id uuid;
  v_pending_count integer;
  v_balance numeric;
BEGIN
  IF NEW.status::text <> 'checked_out'
     OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT id, balance
  INTO v_folio_id, v_balance
  FROM public.folios
  WHERE reservation_id = NEW.id
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  SELECT count(*)
  INTO v_pending_count
  FROM public.payments
  WHERE reservation_id = NEW.id
    AND payment_status::text = 'pending';

  IF v_folio_id IS NOT NULL
     AND abs(COALESCE(v_balance, 0)) <= 0.01
     AND v_pending_count = 0 THEN
    UPDATE public.folios
    SET is_closed = true, status = 'paid', updated_at = now()
    WHERE id = v_folio_id;

    PERFORM public.finance_write_audit(
      'folio_closed_after_checkout', 'folio', v_folio_id,
      jsonb_build_object('reservation_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_close_folio_after_checkout ON public.reservations;
CREATE TRIGGER trg_reservations_close_folio_after_checkout
  AFTER UPDATE OF status ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_close_balanced_folio_after_checkout();

CREATE OR REPLACE FUNCTION public.reopen_folio(p_folio_id uuid, p_reason text)
RETURNS public.folios
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folio public.folios;
BEGIN
  IF NOT public.finance_is_manager() THEN
    RAISE EXCEPTION 'Not authorized to reopen folios' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Reopen reason is required' USING ERRCODE = '23514';
  END IF;

  UPDATE public.folios
  SET is_closed = false, updated_at = now()
  WHERE id = p_folio_id
    AND is_closed = true
  RETURNING * INTO v_folio;

  IF v_folio.id IS NULL THEN
    RAISE EXCEPTION 'Closed folio not found';
  END IF;

  PERFORM public.finance_write_audit(
    'folio_reopened', 'folio', v_folio.id,
    jsonb_build_object('reason', btrim(p_reason))
  );
  RETURN v_folio;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_iban_payment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_iban_payment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_refund(uuid, numeric, public.payment_method, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_refund(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_refund(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_reservation_no_show(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_reservation_finances(uuid, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_folio(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_folio(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_iban_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_iban_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_refund(uuid, numeric, public.payment_method, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_refund(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_refund(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_reservation_no_show(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_reservation_finances(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_folio(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_folio(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Staff can manage folios" ON public.folios;
DROP POLICY IF EXISTS "Authorized staff can manage folios" ON public.folios;
DROP POLICY IF EXISTS "Staff can process payments" ON public.payments;
DROP POLICY IF EXISTS "Authorized staff can process payments" ON public.payments;
DROP POLICY IF EXISTS "Finance staff can insert payments" ON public.payments;

CREATE POLICY "Finance staff can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    public.finance_current_role() IN (
      'system_administrator',
      'general_manager',
      'front_desk_manager',
      'front_desk_agent'
    )
    AND transaction_type = 'payment'
    AND parent_payment_id IS NULL
    AND (
      (payment_method::text = 'bank_transfer_iban' AND payment_status::text = 'pending')
      OR
      (payment_method::text IN ('cash', 'card_terminal') AND payment_status::text = 'paid')
    )
  );

COMMIT;
