-- Historical legacy migration: remove grand_total from folio creation.
--
-- This replacement is the current pre-019 implementation observed in the
-- database. Migration 019 installs its own canonical version.

CREATE OR REPLACE FUNCTION public.trg_reservations_create_folio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.folios
    WHERE reservation_id = NEW.id
  ) THEN
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
    );
  END IF;
  RETURN NEW;
END;
$$;
