-- Historical legacy trigger: populate payments.folio_id and create a folio
-- when necessary.
--
-- Migration 019 removes this trigger. Its canonical payment validator resolves
-- folio_id and rejects mismatched reservation/folio relations, while the
-- canonical reservation trigger guarantees that a folio already exists.

CREATE OR REPLACE FUNCTION public.trg_payments_set_folio_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.folio_id IS NULL AND NEW.reservation_id IS NOT NULL THEN
    SELECT id
    INTO NEW.folio_id
    FROM public.folios
    WHERE reservation_id = NEW.reservation_id
    LIMIT 1;

    IF NEW.folio_id IS NULL THEN
      INSERT INTO public.folios (
        reservation_id,
        guest_id,
        folio_number,
        issued_date,
        total_amount
      )
      SELECT
        NEW.reservation_id,
        r.guest_id,
        public.fn_generate_document_number(
          'FOL-',
          'public.folios'::regclass,
          'folio_number'
        ),
        CURRENT_DATE,
        0
      FROM public.reservations r
      WHERE r.id = NEW.reservation_id
      RETURNING id INTO NEW.folio_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_set_folio_id
  ON public.payments;
CREATE TRIGGER trg_payments_set_folio_id
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_payments_set_folio_id();
