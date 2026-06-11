-- Normalize guest data and prevent duplicate strong identity documents.
--
-- Email and phone are normalized but intentionally not unique: families and
-- corporate guests may legitimately share them. Passport and national ID are
-- strong identifiers and receive partial unique indexes after duplicate checks.

BEGIN;

CREATE OR REPLACE FUNCTION public.trg_guests_normalize_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.first_name := public.fn_clean_text(NEW.first_name);
  NEW.last_name := public.fn_clean_text(NEW.last_name);
  NEW.email := lower(public.fn_clean_text(NEW.email));
  NEW.phone := public.fn_clean_text(NEW.phone);
  NEW.passport_number := upper(public.fn_clean_text(NEW.passport_number));
  NEW.id_number := upper(public.fn_clean_text(NEW.id_number));
  NEW.nationality := public.fn_clean_text(NEW.nationality);
  NEW.city := public.fn_clean_text(NEW.city);
  NEW.country := public.fn_clean_text(NEW.country);
  NEW.postal_code := public.fn_clean_text(NEW.postal_code);
  NEW.company := public.fn_clean_text(NEW.company);
  NEW.loyalty_tier := public.fn_clean_text(NEW.loyalty_tier);

  IF NOT public.fn_is_valid_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid guest email format'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.guests
SET
  first_name = public.fn_clean_text(first_name),
  last_name = public.fn_clean_text(last_name),
  email = lower(public.fn_clean_text(email)),
  phone = public.fn_clean_text(phone),
  passport_number = upper(public.fn_clean_text(passport_number)),
  id_number = upper(public.fn_clean_text(id_number)),
  nationality = public.fn_clean_text(nationality),
  city = public.fn_clean_text(city),
  country = public.fn_clean_text(country),
  postal_code = public.fn_clean_text(postal_code),
  company = public.fn_clean_text(company),
  loyalty_tier = public.fn_clean_text(loyalty_tier);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.guests
    WHERE passport_number IS NOT NULL
    GROUP BY passport_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate guest passport numbers exist; merge or correct them before applying migration 021';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.guests
    WHERE id_number IS NOT NULL
    GROUP BY id_number
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate guest identity numbers exist; merge or correct them before applying migration 021';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_passport_number_unique
  ON public.guests(passport_number)
  WHERE passport_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_id_number_unique
  ON public.guests(id_number)
  WHERE id_number IS NOT NULL;

DROP TRIGGER IF EXISTS trg_guests_normalize_validate
  ON public.guests;
CREATE TRIGGER trg_guests_normalize_validate
BEFORE INSERT OR UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.trg_guests_normalize_validate();

COMMIT;

-- Review possible person duplicates that do not share a strong document ID.
SELECT
  lower(first_name) AS first_name,
  lower(last_name) AS last_name,
  date_of_birth,
  count(*) AS guest_count
FROM public.guests
GROUP BY lower(first_name), lower(last_name), date_of_birth
HAVING count(*) > 1
ORDER BY guest_count DESC;
