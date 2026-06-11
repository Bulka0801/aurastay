-- ============================================================================
-- Migration: housekeeping_task_rls.sql
-- Project: AuraStay
--
-- Призначення:
-- Закріпити правила доступу до задач господарської служби.
--
-- Модель:
--   - housekeeping_staff бачить і оновлює тільки задачі, призначені йому;
--   - housekeeping_supervisor і system_administrator бачать та керують усіма
--     задачами господарської служби;
--   - front desk може автоматично створити тільки checkout_cleaning задачу
--     після виїзду гостя.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
$$;

ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Housekeeping staff can view their tasks"
  ON public.housekeeping_tasks;

DROP POLICY IF EXISTS "Housekeeping supervisors can manage tasks"
  ON public.housekeeping_tasks;

DROP POLICY IF EXISTS "Housekeeping staff can update assigned tasks"
  ON public.housekeeping_tasks;

DROP POLICY IF EXISTS "Housekeeping supervisors can create tasks"
  ON public.housekeeping_tasks;

DROP POLICY IF EXISTS "Front desk can create checkout cleaning tasks"
  ON public.housekeeping_tasks;

DROP POLICY IF EXISTS "Housekeeping supervisors can delete tasks"
  ON public.housekeeping_tasks;

CREATE POLICY "Housekeeping staff can view their tasks"
  ON public.housekeeping_tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR public.current_profile_role() IN (
      'system_administrator',
      'housekeeping_supervisor'
    )
  );

CREATE POLICY "Housekeeping staff can update assigned tasks"
  ON public.housekeeping_tasks
  FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR public.current_profile_role() IN (
      'system_administrator',
      'housekeeping_supervisor'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR public.current_profile_role() IN (
      'system_administrator',
      'housekeeping_supervisor'
    )
  );

CREATE POLICY "Housekeeping supervisors can create tasks"
  ON public.housekeeping_tasks
  FOR INSERT
  WITH CHECK (
    public.current_profile_role() IN (
      'system_administrator',
      'housekeeping_supervisor'
    )
  );

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

CREATE POLICY "Housekeeping supervisors can delete tasks"
  ON public.housekeeping_tasks
  FOR DELETE
  USING (
    public.current_profile_role() IN (
      'system_administrator',
      'housekeeping_supervisor'
    )
  );
