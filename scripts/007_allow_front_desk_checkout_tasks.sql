-- ============================================================================
-- Migration: allow_front_desk_checkout_tasks.sql
-- Project: AuraStay
--
-- Дозволяє рецепції автоматично створювати задачу прибирання після check-out.
-- Політика вузька: front desk може вставити лише pending checkout_cleaning.
-- ============================================================================

DROP POLICY IF EXISTS "Front desk can create checkout cleaning tasks"
  ON public.housekeeping_tasks;

CREATE POLICY "Front desk can create checkout cleaning tasks"
  ON public.housekeeping_tasks
  FOR INSERT
  WITH CHECK (
    public.current_profile_role() IN (
      'front_desk_manager',
      'front_desk_agent'
    )
    AND task_type = 'checkout_cleaning'
    AND status = 'pending'
  );
