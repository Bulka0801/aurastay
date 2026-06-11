ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_guests_is_active
  ON public.guests (is_active);
