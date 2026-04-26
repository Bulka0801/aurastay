-- ============================================================
--  AuraStay — Housekeeping module v2 (Kanban + Inspection)
--  Adds: extended task schema, checklists, inspections,
--        status history, notifications, sync triggers.
-- ============================================================

-- 1. Extend room_status enum -----------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'waiting_inspection'
      AND enumtypid = 'public.room_status'::regtype
  ) THEN
    ALTER TYPE public.room_status ADD VALUE 'waiting_inspection';
  END IF;
END$$;

-- 2. New enum types --------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hk_task_source') THEN
    CREATE TYPE public.hk_task_source AS ENUM (
      'manual', 'system', 'front_desk', 'inspection', 'maintenance'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inspection_status') THEN
    CREATE TYPE public.inspection_status AS ENUM (
      'pending', 'in_progress', 'passed', 'failed',
      'reinspection_pending', 'cancelled'
    );
  END IF;
END$$;

-- 3. Extend housekeeping_tasks with full spec columns ----------
ALTER TABLE public.housekeeping_tasks
  ADD COLUMN IF NOT EXISTS title varchar(160),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_role public.user_role,
  ADD COLUMN IF NOT EXISTS requires_inspection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source public.hk_task_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_hk_status ON public.housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_hk_due_at ON public.housekeeping_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_hk_reservation ON public.housekeeping_tasks(reservation_id);

-- 4. Task checklist items --------------------------------------
CREATE TABLE IF NOT EXISTS public.housekeeping_task_checklist_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES public.housekeeping_tasks(id) ON DELETE CASCADE,
  label varchar(200) NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  notes text,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hk_checklist_task ON public.housekeeping_task_checklist_items(task_id);

-- 5. Room inspections ------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_inspections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES public.housekeeping_tasks(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  checked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.inspection_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  result_comment text,
  fail_reason varchar(80),
  fail_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inspections_task ON public.room_inspections(task_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.room_inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_room ON public.room_inspections(room_id);

-- 6. Inspection checklist items --------------------------------
CREATE TABLE IF NOT EXISTS public.inspection_checklist_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id uuid NOT NULL REFERENCES public.room_inspections(id) ON DELETE CASCADE,
  label varchar(200) NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_checked' CHECK (status IN ('pass', 'fail', 'not_checked')),
  comment text,
  position int DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_inspection_items ON public.inspection_checklist_items(inspection_id);

-- 7. Task status history ---------------------------------------
CREATE TABLE IF NOT EXISTS public.task_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL REFERENCES public.housekeeping_tasks(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_role public.user_role,
  reason text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_status_history_task ON public.task_status_history(task_id);

-- 8. Notifications ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role public.user_role,
  type text NOT NULL,
  title varchar(200) NOT NULL,
  message text NOT NULL,
  related_entity_type varchar(40) NOT NULL,
  related_entity_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, is_read);

-- 9. Maintenance request extension -----------------------------
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS issue_type text,
  ADD COLUMN IF NOT EXISTS reported_by_role public.user_role,
  ADD COLUMN IF NOT EXISTS created_from_task_id uuid REFERENCES public.housekeeping_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_from_inspection_id uuid REFERENCES public.room_inspections(id) ON DELETE SET NULL;

-- 10. RLS policies for new tables ------------------------------
ALTER TABLE public.housekeeping_task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_checklist_items" ON public.housekeeping_task_checklist_items;
CREATE POLICY "view_checklist_items"
  ON public.housekeeping_task_checklist_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "manage_checklist_items" ON public.housekeeping_task_checklist_items;
CREATE POLICY "manage_checklist_items"
  ON public.housekeeping_task_checklist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('system_admin', 'housekeeping_supervisor', 'housekeeping_staff')
    )
  );

DROP POLICY IF EXISTS "view_inspections" ON public.room_inspections;
CREATE POLICY "view_inspections"
  ON public.room_inspections FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "manage_inspections" ON public.room_inspections;
CREATE POLICY "manage_inspections"
  ON public.room_inspections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('system_admin', 'housekeeping_supervisor')
    )
  );

DROP POLICY IF EXISTS "view_inspection_items" ON public.inspection_checklist_items;
CREATE POLICY "view_inspection_items"
  ON public.inspection_checklist_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "manage_inspection_items" ON public.inspection_checklist_items;
CREATE POLICY "manage_inspection_items"
  ON public.inspection_checklist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('system_admin', 'housekeeping_supervisor')
    )
  );

DROP POLICY IF EXISTS "view_status_history" ON public.task_status_history;
CREATE POLICY "view_status_history"
  ON public.task_status_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "insert_status_history" ON public.task_status_history;
CREATE POLICY "insert_status_history"
  ON public.task_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "view_own_notifications" ON public.notifications;
CREATE POLICY "view_own_notifications"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "create_notifications" ON public.notifications;
CREATE POLICY "create_notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 11. updated_at trigger for housekeeping_tasks ----------------
DROP TRIGGER IF EXISTS update_housekeeping_tasks_updated_at ON public.housekeeping_tasks;
CREATE TRIGGER update_housekeeping_tasks_updated_at
  BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Trigger: log status changes to task_status_history -------
CREATE OR REPLACE FUNCTION public.log_hk_task_status_change()
RETURNS trigger AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by, changed_by_role)
    VALUES (NEW.id, NULL, NEW.status, auth.uid(), v_role);
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by, changed_by_role)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), v_role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hk_task_status_change_log ON public.housekeeping_tasks;
CREATE TRIGGER hk_task_status_change_log
  AFTER INSERT OR UPDATE OF status ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_hk_task_status_change();

-- 13. Helper: default checklist labels for a task type ---------
CREATE OR REPLACE FUNCTION public.default_checklist_labels(p_task_type text)
RETURNS text[] AS $$
BEGIN
  CASE p_task_type
    WHEN 'checkout_cleaning' THEN
      RETURN ARRAY[
        'Зняти білизну',
        'Замінити білизну та рушники',
        'Прибрати санвузол',
        'Пропилососити підлогу',
        'Перевірити мінібар',
        'Винести сміття',
        'Перевірити пошкодження'
      ];
    WHEN 'stayover_cleaning' THEN
      RETURN ARRAY[
        'Замінити рушники за запитом',
        'Винести сміття',
        'Заправити ліжко',
        'Поповнити засоби'
      ];
    WHEN 'deep_cleaning' THEN
      RETURN ARRAY[
        'Прибрати під ліжком',
        'Помити вікна',
        'Глибоке прибирання санвузла',
        'Перевірити штори',
        'Перевірити стан меблів'
      ];
    WHEN 'vip_preparation' THEN
      RETURN ARRAY[
        'Преміум-амініті',
        'Свіжі квіти або вітальний набір',
        'Питна вода у мінібарі',
        'Привітальна записка',
        'Перевірка температури та освітлення'
      ];
    WHEN 'linen_change' THEN
      RETURN ARRAY[
        'Зняти стару білизну',
        'Замінити постільну білизну',
        'Замінити рушники'
      ];
    WHEN 'post_maintenance_cleaning' THEN
      RETURN ARRAY[
        'Прибрати після ремонту',
        'Протерти всі поверхні',
        'Перевірити функціональність обладнання',
        'Замінити білизну за потреби'
      ];
    WHEN 'inspection_rework' THEN
      RETURN ARRAY[
        'Виправити зауваження попередньої перевірки',
        'Перевірити проблемні зони',
        'Підготувати до повторної перевірки'
      ];
    WHEN 'amenity_delivery' THEN
      RETURN ARRAY[
        'Доставити запитані предмети',
        'Перевірити отримання'
      ];
    WHEN 'towel_request' THEN
      RETURN ARRAY[
        'Підготувати рушники',
        'Доставити в номер'
      ];
    ELSE
      RETURN ARRAY[
        'Загальне прибирання',
        'Перевірка готовності'
      ];
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 14. Inspection default checklist labels ----------------------
CREATE OR REPLACE FUNCTION public.default_inspection_labels()
RETURNS text[] AS $$
BEGIN
  RETURN ARRAY[
    'Ліжко заправлене',
    'Санвузол чистий',
    'Рушники замінені',
    'Мінібар перевірено',
    'Сміття винесено',
    'Немає запаху або плям',
    'Немає видимих пошкоджень'
  ];
END;
$$ LANGUAGE plpgsql;
