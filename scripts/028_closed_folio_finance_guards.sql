-- Closed folios are immutable. Existing pending transactions may still be
-- completed or failed, but no new money movement or charge changes are allowed.

CREATE OR REPLACE FUNCTION public.prevent_closed_folio_finance_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_folio_id uuid;
  v_is_closed boolean;
BEGIN
  v_folio_id := COALESCE(NEW.folio_id, OLD.folio_id);

  SELECT is_closed
  INTO v_is_closed
  FROM public.folios
  WHERE id = v_folio_id;

  IF COALESCE(v_is_closed, false) THEN
    RAISE EXCEPTION 'Closed folio must be reopened before creating or changing financial records'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_guard_closed_folio_insert ON public.payments;
CREATE TRIGGER trg_payments_guard_closed_folio_insert
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closed_folio_finance_mutation();

DROP TRIGGER IF EXISTS trg_folio_charges_guard_closed_folio ON public.folio_charges;
CREATE TRIGGER trg_folio_charges_guard_closed_folio
  BEFORE INSERT OR UPDATE ON public.folio_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closed_folio_finance_mutation();
