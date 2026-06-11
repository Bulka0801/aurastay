-- Purpose:
--   Remove obsolete advance-window fields from public.rate_plans.
--
-- Why:
--   The application no longer uses min_advance_days or max_advance_days in
--   tariff creation/editing. Keeping unused columns makes the admin UI and
--   database model disagree, which is risky for future changes.
--
-- What changes after running this:
--   public.rate_plans will no longer have min_advance_days or max_advance_days.
--   Existing tariff names, codes, discounts, policies and activity flags are not changed.
--
-- Safety notes:
--   - DROP COLUMN IF EXISTS makes this script safe to run more than once.
--   - If you still need historical values from these two columns, export them before running.

ALTER TABLE public.rate_plans
  DROP COLUMN IF EXISTS min_advance_days,
  DROP COLUMN IF EXISTS max_advance_days;
