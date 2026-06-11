-- Historical legacy migration: repair folio totals and recreate the old view.
--
-- This migration predates separate payment/refund transactions. It is kept
-- only to document the current database history. Migration 020 recalculates
-- the canonical caches and replaces this view.
--
-- Do not run this file after migration 020.

BEGIN;

UPDATE public.folios f
SET total_amount = COALESCE((
  SELECT SUM(fc.amount * fc.quantity)
  FROM public.folio_charges fc
  WHERE fc.folio_id = f.id
), 0)
WHERE EXISTS (
  SELECT 1
  FROM public.folio_charges fc
  WHERE fc.folio_id = f.id
);

UPDATE public.payments p
SET folio_id = f.id
FROM public.folios f
WHERE p.reservation_id = f.reservation_id
  AND p.folio_id IS NULL;

UPDATE public.payments
SET payment_status = 'paid'::public.payment_status
WHERE payment_status IS NULL
  AND amount > 0;

CREATE OR REPLACE VIEW public.v_folios_with_payments AS
SELECT
  f.id,
  f.folio_number,
  f.status,
  f.total_amount AS total_charges,
  COALESCE(SUM(p.amount), 0) AS total_payments,
  f.total_amount - COALESCE(SUM(p.amount), 0) AS balance,
  f.issued_date,
  f.created_at,
  f.updated_at,
  f.reservation_id,
  f.guest_id
FROM public.folios f
LEFT JOIN public.payments p
  ON p.folio_id = f.id
 AND p.payment_status::text IN ('paid', 'partial')
GROUP BY f.id;

COMMIT;
