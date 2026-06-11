-- Historical legacy migration: normalize payment methods.
--
-- This migration records a manual database change that was applied before the
-- canonical finance migrations 017-020. It is not part of the fresh-database
-- migration sequence because the current bootstrap schema already defines the
-- canonical public.payment_method enum.
--
-- Canonical values:
--   cash
--   card_terminal
--   bank_transfer_iban
--
-- Run only on a legacy database that still uses credit_card, debit_card,
-- bank_transfer, or corporate_account. Back up the database before running.

BEGIN;

DO $$
DECLARE
  v_unmapped_count bigint;
BEGIN
  IF to_regclass('public.payments') IS NULL THEN
    RAISE EXCEPTION 'public.payments does not exist';
  END IF;

  SELECT count(*)
  INTO v_unmapped_count
  FROM public.payments
  WHERE payment_method::text NOT IN (
    'cash',
    'credit_card',
    'debit_card',
    'bank_transfer',
    'corporate_account',
    'card_terminal',
    'bank_transfer_iban'
  );

  IF v_unmapped_count > 0 THEN
    RAISE EXCEPTION
      'Found % payments with unsupported payment methods',
      v_unmapped_count;
  END IF;
END;
$$;

DROP TYPE IF EXISTS public.payment_method_new;

CREATE TYPE public.payment_method_new AS ENUM (
  'cash',
  'card_terminal',
  'bank_transfer_iban'
);

ALTER TABLE public.payments
  ADD COLUMN payment_method_temp public.payment_method_new;

UPDATE public.payments
SET payment_method_temp = CASE payment_method::text
  WHEN 'cash' THEN 'cash'::public.payment_method_new
  WHEN 'credit_card' THEN 'card_terminal'::public.payment_method_new
  WHEN 'debit_card' THEN 'card_terminal'::public.payment_method_new
  WHEN 'card_terminal' THEN 'card_terminal'::public.payment_method_new
  WHEN 'bank_transfer' THEN 'bank_transfer_iban'::public.payment_method_new
  WHEN 'corporate_account' THEN 'bank_transfer_iban'::public.payment_method_new
  WHEN 'bank_transfer_iban' THEN 'bank_transfer_iban'::public.payment_method_new
END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE payment_method_temp IS NULL
  ) THEN
    RAISE EXCEPTION 'Payment method conversion produced NULL values';
  END IF;
END;
$$;

ALTER TABLE public.payments
  DROP COLUMN payment_method;

ALTER TABLE public.payments
  RENAME COLUMN payment_method_temp TO payment_method;

DROP TYPE public.payment_method;

ALTER TYPE public.payment_method_new
  RENAME TO payment_method;

ALTER TABLE public.payments
  ALTER COLUMN payment_method SET NOT NULL;

COMMIT;

-- Verification: expected values are cash, card_terminal and bank_transfer_iban.
SELECT payment_method, count(*)
FROM public.payments
GROUP BY payment_method
ORDER BY payment_method;
