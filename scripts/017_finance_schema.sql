-- Finance model: schema additions only.
-- Apply before 018_finance_backfill.sql and 019_finance_logic.sql.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS parent_payment_id uuid,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_changed_by uuid,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS refund_method_override_reason text;

ALTER TABLE public.folio_charges
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS charge_status text,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.folios
  ADD COLUMN IF NOT EXISTS paid_amount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_closed boolean NOT NULL DEFAULT false;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_by uuid,
  ADD COLUMN IF NOT EXISTS no_show_reason text,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescheduled_by uuid,
  ADD COLUMN IF NOT EXISTS reschedule_reason text;

DO $$
DECLARE
  profiles_kind "char";
  profile_table regclass;
BEGIN
  SELECT c.relkind
  INTO profiles_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'profiles';

  IF profiles_kind IN ('r', 'p') THEN
    profile_table := 'public.profiles'::regclass;
  ELSIF profiles_kind = 'v' THEN
    IF to_regclass('public.users') IS NOT NULL THEN
      profile_table := 'public.users'::regclass;
    ELSIF to_regclass('public."user"') IS NOT NULL THEN
      profile_table := 'public."user"'::regclass;
    ELSE
      RAISE EXCEPTION
        'public.profiles is a view, but neither public.users nor public."user" exists';
    END IF;
  ELSE
    RAISE EXCEPTION
      'public.profiles does not exist or has unsupported relkind: %',
      profiles_kind;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_parent_payment_id_fkey'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_parent_payment_id_fkey
      FOREIGN KEY (parent_payment_id)
      REFERENCES public.payments(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_status_changed_by_fkey'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.payments
         ADD CONSTRAINT payments_status_changed_by_fkey
         FOREIGN KEY (status_changed_by)
         REFERENCES %s(id)
         ON DELETE SET NULL',
      profile_table
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'folio_charges_created_by_fkey'
      AND conrelid = 'public.folio_charges'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.folio_charges
         ADD CONSTRAINT folio_charges_created_by_fkey
         FOREIGN KEY (created_by)
         REFERENCES %s(id)
         ON DELETE SET NULL',
      profile_table
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'folio_charges_voided_by_fkey'
      AND conrelid = 'public.folio_charges'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.folio_charges
         ADD CONSTRAINT folio_charges_voided_by_fkey
         FOREIGN KEY (voided_by)
         REFERENCES %s(id)
         ON DELETE SET NULL',
      profile_table
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reservations_no_show_by_fkey'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.reservations
         ADD CONSTRAINT reservations_no_show_by_fkey
         FOREIGN KEY (no_show_by)
         REFERENCES %s(id)
         ON DELETE SET NULL',
      profile_table
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reservations_rescheduled_by_fkey'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.reservations
         ADD CONSTRAINT reservations_rescheduled_by_fkey
         FOREIGN KEY (rescheduled_by)
         REFERENCES %s(id)
         ON DELETE SET NULL',
      profile_table
    );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_payments_parent_payment_id
  ON public.payments(parent_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_reservation_transaction_status
  ON public.payments(reservation_id, transaction_type, payment_status);

CREATE INDEX IF NOT EXISTS idx_folio_charges_folio_status_category
  ON public.folio_charges(folio_id, charge_status, category);

CREATE INDEX IF NOT EXISTS idx_reservations_no_show_at
  ON public.reservations(no_show_at);
