-- Historical legacy migration: backfill folios and accommodation charges.
--
-- This file records a manual migration applied before 017-020. Do not run it
-- in the canonical migration sequence. Migration 018 performs the normalized
-- backfill for the current finance model.
--
-- Historical limitation:
--   Only reservations that already had payments received a folio. Reservations
--   without payments could remain without a folio. Migration 018 now closes
--   that gap before strict finance constraints are enabled.

BEGIN;

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

CREATE OR REPLACE FUNCTION public.fn_sync_reservation_payment_totals(
  p_reservation_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_paid numeric;
BEGIN
  IF p_reservation_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM 1
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_paid := public.fn_reservation_net_paid(p_reservation_id);

  UPDATE public.reservations
  SET paid_amount = GREATEST(v_paid, 0),
      updated_at = now()
  WHERE id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_folio_totals(p_folio_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total numeric;
BEGIN
  IF p_folio_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(fc.amount * fc.quantity), 0)
  INTO v_total
  FROM public.folio_charges fc
  WHERE fc.folio_id = p_folio_id;

  UPDATE public.folios
  SET total_amount = v_total,
      updated_at = now()
  WHERE id = p_folio_id;
END;
$$;

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
    'FOL',
    'public.folios'::regclass,
    'folio_number'
  ),
  COALESCE(
    (
      SELECT min(payment_date)::date
      FROM public.payments
      WHERE reservation_id = r.id
    ),
    r.created_at::date,
    CURRENT_DATE
  ),
  0
FROM public.reservations r
WHERE EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.reservation_id = r.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.folios f
    WHERE f.reservation_id = r.id
  );

UPDATE public.payments p
SET folio_id = f.id
FROM public.folios f
WHERE p.reservation_id = f.reservation_id
  AND p.folio_id IS NULL;

INSERT INTO public.folio_charges (
  folio_id,
  description,
  amount,
  quantity,
  charge_date,
  category
)
SELECT
  f.id,
  'Проживання (загальна вартість)',
  r.total_amount,
  1,
  r.check_in_date,
  'accommodation'
FROM public.folios f
JOIN public.reservations r ON r.id = f.reservation_id
WHERE NOT EXISTS (
    SELECT 1
    FROM public.folio_charges fc
    WHERE fc.folio_id = f.id
  )
  AND r.total_amount > 0;

DO $$
DECLARE
  v_folio_id uuid;
BEGIN
  FOR v_folio_id IN
    SELECT f.id
    FROM public.folios f
    WHERE EXISTS (
      SELECT 1
      FROM public.folio_charges fc
      WHERE fc.folio_id = f.id
    )
  LOOP
    PERFORM public.fn_sync_folio_totals(v_folio_id);
  END LOOP;
END;
$$;

COMMIT;
