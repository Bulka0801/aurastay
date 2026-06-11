-- Я ВИКОНАЛА
-- Purpose:
--   Keep the profile "updated_at" timestamp correct at the database level.
--
-- Why this is needed:
--   Application code can forget to pass updated_at on update, or different parts of
--   the app can update the same profile through different paths. A database trigger
--   makes the timestamp consistent for every update, not only for one form.
--
-- What changes after running this:
--   Existing rows are not changed immediately. On the next UPDATE of a user/profile
--   row, updated_at will automatically become NOW().
--
-- Supported database shapes:
--   1) public.profiles is a real table.
--   2) public.profiles is a view over public.users or public."user".
--
-- Safety notes:
--   - This does not delete users or profile data.
--   - This only creates/replaces a trigger function and attaches one BEFORE UPDATE trigger.
--   - If the target table does not have updated_at, the script stops with a clear error.
--   - If an older profile updated_at trigger exists, it is removed to avoid duplicate triggers
--     doing the same work.

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  profiles_kind text;
  trigger_target regclass;
  target_has_updated_at boolean;
BEGIN
  -- Find out whether public.profiles is a table/partitioned table or a view.
  SELECT c.relkind
  INTO profiles_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'profiles';

  IF profiles_kind IN ('r', 'p') THEN
    -- profiles is a physical table, so the trigger belongs directly on profiles.
    trigger_target := 'public.profiles'::regclass;
  ELSIF profiles_kind = 'v' THEN
    -- PostgreSQL cannot attach a normal table trigger to a view for this use case.
    -- If profiles is a view, attach the trigger to its underlying user table.
    IF to_regclass('public.users') IS NOT NULL THEN
      trigger_target := 'public.users'::regclass;
    ELSIF to_regclass('public."user"') IS NOT NULL THEN
      trigger_target := 'public."user"'::regclass;
    ELSE
      RAISE EXCEPTION 'public.profiles is a view, but neither public.users nor public."user" exists';
    END IF;
  ELSE
    RAISE EXCEPTION 'public.profiles does not exist or has unsupported relkind: %', profiles_kind;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = trigger_target
      AND attname = 'updated_at'
      AND NOT attisdropped
  )
  INTO target_has_updated_at;

  IF NOT target_has_updated_at THEN
    RAISE EXCEPTION 'Target table % does not have updated_at column', trigger_target;
  END IF;

  -- Remove this migration's trigger if it was already applied.
  EXECUTE format('DROP TRIGGER IF EXISTS set_profile_updated_at ON %s', trigger_target);

  -- Remove the older trigger name used in early schema scripts, if present, so
  -- updated_at is not assigned twice on every update.
  EXECUTE format('DROP TRIGGER IF EXISTS update_profiles_updated_at ON %s', trigger_target);

  -- Attach the trigger. From now on, every UPDATE to the target table refreshes updated_at.
  EXECUTE format(
    'CREATE TRIGGER set_profile_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW
       EXECUTE FUNCTION public.set_updated_at_timestamp()',
    trigger_target
  );
END $$;
