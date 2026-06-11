-- Historical legacy migration: add the temporary payments -> folios relation.
--
-- This relation is retained for backward compatibility. The canonical
-- reservation relation remains payments.reservation_id, and finance migration
-- 019 validates that both references belong to the same reservation.
--
-- This file records a migration already applied to the current database.
-- Do not rerun it unless the target database is missing this relation.

BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS folio_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_payments_folio'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT fk_payments_folio
      FOREIGN KEY (folio_id)
      REFERENCES public.folios(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_payments_folio_id
  ON public.payments(folio_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.folios
    WHERE reservation_id IS NOT NULL
    GROUP BY reservation_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate folios exist for a reservation; resolve them before payment backfill';
  END IF;
END;
$$;

UPDATE public.payments p
SET folio_id = f.id
FROM public.folios f
WHERE p.reservation_id = f.reservation_id
  AND p.folio_id IS NULL
  AND f.reservation_id IS NOT NULL;

COMMIT;

-- Expected result: zero rows after every reservation has exactly one folio.
SELECT p.id, p.reservation_id
FROM public.payments p
WHERE p.reservation_id IS NOT NULL
  AND p.folio_id IS NULL;
