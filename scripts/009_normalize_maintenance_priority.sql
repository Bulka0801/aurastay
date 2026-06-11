-- Normalize maintenance/housekeeping priorities to the canonical value set:
-- low, normal, high, urgent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'maintenance_priority'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'maintenance_priority'
      AND e.enumlabel = 'normal'
  ) THEN
    ALTER TYPE public.maintenance_priority ADD VALUE 'normal';
  END IF;
END $$;

UPDATE public.housekeeping_tasks
SET priority = 'normal'
WHERE priority = 'medium';

UPDATE public.maintenance_requests
SET priority = 'normal'
WHERE priority::text = 'medium';

ALTER TABLE public.housekeeping_tasks
  ALTER COLUMN priority SET DEFAULT 'normal';

ALTER TABLE public.maintenance_requests
  ALTER COLUMN priority SET DEFAULT 'normal';
