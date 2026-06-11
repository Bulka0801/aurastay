-- Historical legacy migration: create missing folios for paid reservations and
-- restore payments.folio_id.
--
-- Migration 018 supersedes this script and creates folios for every
-- reservation, including reservations without payments.

BEGIN;

UPDATE public.payments p
SET folio_id = f.id
FROM public.folios f
WHERE p.reservation_id = f.reservation_id
  AND p.folio_id IS NULL;

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

COMMIT;
