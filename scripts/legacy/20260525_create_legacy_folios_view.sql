-- Historical legacy migration: first UI-oriented folio view.
--
-- This view only counts paid/partial incoming payments and does not model
-- refunds or pending transactions. Migration 020 replaces it with the
-- canonical v_folios_with_payments definition.
--
-- Do not run this file after migration 020.

BEGIN;

ALTER TABLE public.folios
  ALTER COLUMN status SET DEFAULT 'pending'::public.payment_status;

UPDATE public.folios
SET status = 'pending'
WHERE status IS NULL;

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

CREATE INDEX IF NOT EXISTS idx_folios_status
  ON public.folios(status);

COMMIT;
