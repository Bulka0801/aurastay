-- Historical one-time data repair for selected cancelled/no-show reservations.
--
-- This is not a reusable migration. It records a manual financial decision
-- applied to the listed reservations. Do not rerun it: the NOT EXISTS guard is
-- broad, and the original script did not write a user/reason audit record.
--
-- Migration 020 recalculates folio status and balance from confirmed charges
-- and canonical payment/refund transactions, so the old direct status update
-- is not treated as a source of truth.

BEGIN;

CREATE TEMP TABLE target_reservations_temp AS
SELECT id
FROM public.reservations
WHERE reservation_number IN (
  'RES94372060',
  'RES08435636',
  'RES32869609',
  'RES55468137',
  'RES55500995',
  'RES55536685',
  'RES80948642'
);

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
  'Коригування: списання заборгованості (скасовано/no-show, передоплата утримана)',
  -(f.total_amount - COALESCE(SUM(p.amount), 0)),
  1,
  CURRENT_DATE,
  'adjustment'
FROM target_reservations_temp t
JOIN public.folios f ON f.reservation_id = t.id
LEFT JOIN public.payments p
  ON p.folio_id = f.id
 AND p.payment_status::text IN ('paid', 'partial')
GROUP BY f.id, f.total_amount
HAVING (f.total_amount - COALESCE(SUM(p.amount), 0)) > 0
   AND NOT EXISTS (
     SELECT 1
     FROM public.folio_charges fc
     WHERE fc.folio_id = f.id
       AND fc.amount < 0
       AND fc.category = 'adjustment'
   );

UPDATE public.folios f
SET total_amount = COALESCE((
  SELECT SUM(fc.amount * fc.quantity)
  FROM public.folio_charges fc
  WHERE fc.folio_id = f.id
), 0)
FROM target_reservations_temp t
WHERE f.reservation_id = t.id;

UPDATE public.folios f
SET status = 'paid'::public.payment_status,
    updated_at = now()
FROM target_reservations_temp t
WHERE f.reservation_id = t.id
  AND f.status::text NOT IN ('paid', 'refunded')
  AND f.total_amount = (
    SELECT COALESCE(SUM(fc.amount * fc.quantity), 0)
    FROM public.folio_charges fc
    WHERE fc.folio_id = f.id
  );

DROP TABLE target_reservations_temp;

COMMIT;
