-- Record the employee responsible for cancelling a reservation.

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS cancelled_by UUID;

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
    WHERE conname = 'reservations_cancelled_by_fkey'
      AND conrelid = 'public.reservations'::regclass
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.reservations
         ADD CONSTRAINT reservations_cancelled_by_fkey
         FOREIGN KEY (cancelled_by)
         REFERENCES %s(id)
         ON DELETE SET NULL',
      profile_table
    );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_reservations_cancelled_at
  ON public.reservations(cancelled_at);

CREATE INDEX IF NOT EXISTS idx_reservations_cancelled_by
  ON public.reservations(cancelled_by);
