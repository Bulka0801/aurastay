-- Normalize historical finance data before strict constraints are enabled.

BEGIN;

-- Legacy validators reject any UPDATE to historical IBAN rows that predate
-- transaction_id. Migration 019 installs the canonical validator.
DROP TRIGGER IF EXISTS trg_payments_validate ON public.payments;
DROP TRIGGER IF EXISTS validate_iban_payment_instruction_on_payments
  ON public.payments;

-- Every reservation owns exactly one folio, including reservations that have
-- not received a payment yet.
INSERT INTO public.folios (
  reservation_id,
  guest_id,
  folio_number,
  issued_date,
  total_amount
)
SELECT
  r.id,
  r.guest_id,
  public.fn_generate_document_number(
    'FOL-',
    'public.folios'::regclass,
    'folio_number'
  ),
  COALESCE(r.created_at::date, CURRENT_DATE),
  0
FROM public.reservations r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.folios f
  WHERE f.reservation_id = r.id
);

UPDATE public.payments
SET transaction_type = CASE
  WHEN payment_status::text = 'refunded' THEN 'refund'
  ELSE 'payment'
END
WHERE transaction_type IS NULL
   OR transaction_type NOT IN ('payment', 'refund');

-- Preserve old IBAN payments without inventing a bank reference. The explicit
-- LEGACY marker keeps them auditable while satisfying the canonical contract.
UPDATE public.payments
SET transaction_id = 'LEGACY-' || id::text
WHERE transaction_type = 'payment'
  AND payment_method::text = 'bank_transfer_iban'
  AND NULLIF(btrim(transaction_id), '') IS NULL;

-- `partial` described the reservation-level result, not an individual
-- transaction. Historical rows are settled payments and become `paid`.
UPDATE public.payments
SET payment_status = 'paid'
WHERE transaction_type = 'payment'
  AND payment_status::text = 'partial';

UPDATE public.payments
SET status_changed_at = COALESCE(payment_date, created_at, now())
WHERE status_changed_at IS NULL;

UPDATE public.folio_charges
SET charge_status = 'confirmed'
WHERE charge_status IS NULL
   OR charge_status NOT IN ('confirmed', 'voided');

UPDATE public.folio_charges
SET category = COALESCE(NULLIF(category, ''), 'accommodation')
WHERE category IS NULL OR btrim(category) = '';

-- Restore reservation_id from folio for legacy payments.
UPDATE public.payments p
SET reservation_id = f.reservation_id
FROM public.folios f
WHERE p.reservation_id IS NULL
  AND p.folio_id = f.id;

-- Restore folio_id from the canonical reservation relation.
UPDATE public.payments p
SET folio_id = f.id
FROM public.folios f
WHERE p.reservation_id = f.reservation_id
  AND p.folio_id IS NULL;

-- Link legacy refund rows to a settled payment from the same reservation.
WITH candidates AS (
  SELECT
    refund.id AS refund_id,
    (
      SELECT payment.id
      FROM public.payments payment
      WHERE payment.reservation_id = refund.reservation_id
        AND payment.transaction_type = 'payment'
        AND payment.payment_status::text IN ('paid', 'partial')
        AND payment.created_at <= refund.created_at
      ORDER BY payment.created_at DESC
      LIMIT 1
    ) AS parent_id
  FROM public.payments refund
  WHERE refund.transaction_type = 'refund'
    AND refund.parent_payment_id IS NULL
)
UPDATE public.payments refund
SET parent_payment_id = candidates.parent_id
FROM candidates
WHERE refund.id = candidates.refund_id
  AND candidates.parent_id IS NOT NULL;

-- A legacy refund could cover several incoming payments. The canonical model
-- requires each refund row to reference one parent payment, so split only the
-- over-allocated historical rows while preserving their combined amount.
DO $$
DECLARE
  v_refund public.payments;
  v_payment record;
  v_remaining numeric;
  v_available numeric;
  v_piece numeric;
  v_first_piece boolean;
BEGIN
  FOR v_refund IN
    SELECT refund.*
    FROM public.payments refund
    JOIN public.payments parent ON parent.id = refund.parent_payment_id
    WHERE refund.transaction_type = 'refund'
      AND refund.payment_status::text IN ('pending', 'refunded')
      AND (
        SELECT COALESCE(SUM(other_refund.amount), 0)
        FROM public.payments other_refund
        WHERE other_refund.parent_payment_id = parent.id
          AND other_refund.transaction_type = 'refund'
          AND other_refund.payment_status::text IN ('pending', 'refunded')
      ) > parent.amount + 0.01
    ORDER BY refund.created_at, refund.id
    FOR UPDATE OF refund
  LOOP
    v_remaining := v_refund.amount;
    v_first_piece := true;

    -- Remove this row from capacity calculations while it is redistributed.
    UPDATE public.payments
    SET parent_payment_id = NULL
    WHERE id = v_refund.id;

    FOR v_payment IN
      SELECT
        payment.*,
        payment.amount - COALESCE((
          SELECT SUM(existing_refund.amount)
          FROM public.payments existing_refund
          WHERE existing_refund.parent_payment_id = payment.id
            AND existing_refund.transaction_type = 'refund'
            AND existing_refund.payment_status::text IN ('pending', 'refunded')
        ), 0) AS available_amount
      FROM public.payments payment
      WHERE payment.reservation_id = v_refund.reservation_id
        AND payment.transaction_type = 'payment'
        AND payment.payment_status::text = 'paid'
        AND payment.created_at <= v_refund.created_at
      ORDER BY payment.created_at DESC, payment.id
      FOR UPDATE OF payment
    LOOP
      EXIT WHEN v_remaining <= 0.01;

      v_available := GREATEST(v_payment.available_amount, 0);
      v_piece := LEAST(v_remaining, v_available);

      IF v_piece > 0.01 AND v_first_piece THEN
        UPDATE public.payments
        SET amount = round(v_piece, 2),
            parent_payment_id = v_payment.id
        WHERE id = v_refund.id;
        v_first_piece := false;
        v_remaining := round(v_remaining - v_piece, 2);
      ELSIF v_piece > 0.01 THEN
        INSERT INTO public.payments (
          reservation_id,
          amount,
          payment_status,
          transaction_id,
          card_last_four,
          payment_date,
          processed_by,
          notes,
          created_at,
          payment_method,
          folio_id,
          transaction_type,
          parent_payment_id,
          status_changed_at,
          status_changed_by,
          failure_reason,
          refund_method_override_reason
        )
        VALUES (
          v_refund.reservation_id,
          round(v_piece, 2),
          v_refund.payment_status,
          v_refund.transaction_id,
          v_refund.card_last_four,
          v_refund.payment_date,
          v_refund.processed_by,
          concat_ws(
            E'\n',
            NULLIF(v_refund.notes, ''),
            'Частина історичного повернення ' || v_refund.id::text
          ),
          v_refund.created_at,
          v_refund.payment_method,
          v_refund.folio_id,
          'refund',
          v_payment.id,
          v_refund.status_changed_at,
          v_refund.status_changed_by,
          v_refund.failure_reason,
          v_refund.refund_method_override_reason
        );
        v_remaining := round(v_remaining - v_piece, 2);
      END IF;
    END LOOP;

    IF v_remaining > 0.01 THEN
      RAISE EXCEPTION
        'Historical refund % exceeds refundable payments by %',
        v_refund.id,
        v_remaining;
    END IF;
  END LOOP;
END;
$$;

-- Ensure each reservation folio has an accommodation charge when it has no
-- confirmed charges yet. Existing charge history is preserved.
INSERT INTO public.folio_charges (
  folio_id,
  description,
  amount,
  quantity,
  charge_date,
  category,
  charge_status
)
SELECT
  f.id,
  'Проживання за бронюванням ' || r.reservation_number,
  r.total_amount,
  1,
  r.check_in_date,
  'accommodation',
  'confirmed'
FROM public.folios f
JOIN public.reservations r ON r.id = f.reservation_id
WHERE COALESCE(r.total_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.folio_charges fc
    WHERE fc.folio_id = f.id
      AND fc.charge_status = 'confirmed'
  );

COMMIT;

-- Review these result sets before applying 019_finance_logic.sql.
SELECT p.id, p.reservation_id, p.folio_id, p.transaction_type, p.payment_status
FROM public.payments p
WHERE p.reservation_id IS NULL
   OR p.folio_id IS NULL;

SELECT p.id, p.reservation_id, p.amount
FROM public.payments p
WHERE p.transaction_type = 'refund'
  AND p.parent_payment_id IS NULL;

SELECT f.reservation_id, count(*) AS folio_count
FROM public.folios f
GROUP BY f.reservation_id
HAVING count(*) > 1;

SELECT p.id, p.reservation_id, p.folio_id, f.reservation_id AS folio_reservation_id
FROM public.payments p
JOIN public.folios f ON f.id = p.folio_id
WHERE p.reservation_id IS DISTINCT FROM f.reservation_id;

SELECT p.id, p.reservation_id, p.transaction_id
FROM public.payments p
WHERE p.transaction_type = 'payment'
  AND p.payment_method::text = 'bank_transfer_iban'
  AND NULLIF(btrim(p.transaction_id), '') IS NULL;

SELECT
  parent.id AS parent_payment_id,
  parent.reservation_id,
  parent.amount AS payment_amount,
  SUM(refund.amount) AS refund_amount
FROM public.payments parent
JOIN public.payments refund ON refund.parent_payment_id = parent.id
WHERE refund.transaction_type = 'refund'
  AND refund.payment_status::text IN ('pending', 'refunded')
GROUP BY parent.id, parent.reservation_id, parent.amount
HAVING SUM(refund.amount) > parent.amount + 0.01;
