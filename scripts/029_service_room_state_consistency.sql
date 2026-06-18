-- Узгодження станів номерів із задачами господарської та технічної служб.
--
-- Усі побічні зміни стану номера виконуються на рівні бази даних. Завдяки
-- цьому результат не залежить від того, через який екран або API створено
-- чи оновлено задачу.

-- ---------------------------------------------------------------------------
-- Господарська служба
-- ---------------------------------------------------------------------------
-- Синхронізує housekeeping_status номера зі станом задачі:
--   pending / assigned -> номер потребує прибирання;
--   in_progress        -> прибирання або перевірка виконується;
--   completed          -> прибирання очікує перевірки;
--   inspected          -> номер перевірено.
CREATE OR REPLACE FUNCTION public.trg_housekeeping_tasks_room_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Не виконуємо зайві UPDATE номера, якщо значущі поля задачі не змінилися.
  IF TG_OP = 'UPDATE'
     AND OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.room_id IS NOT DISTINCT FROM NEW.room_id
     AND OLD.task_type IS NOT DISTINCT FROM NEW.task_type THEN
    RETURN NEW;
  END IF;

  IF NEW.status::text IN ('pending', 'assigned') THEN
    -- Створення звичайної задачі означає, що номер потребує прибирання.
    -- Задача перевірки сама по собі не повинна робити чистий номер брудним.
    IF NEW.task_type <> 'inspection' THEN
      UPDATE public.rooms
      SET housekeeping_status = 'dirty'::public.room_housekeeping_status
      WHERE id = NEW.room_id;
    END IF;
  ELSIF NEW.status::text = 'in_progress' THEN
    -- Для інспекції використовується окремий стан inspecting, для інших
    -- задач — cleaning.
    UPDATE public.rooms
    SET housekeeping_status = CASE
      WHEN NEW.task_type = 'inspection'
        THEN 'inspecting'::public.room_housekeeping_status
      ELSE 'cleaning'::public.room_housekeeping_status
    END
    WHERE id = NEW.room_id;
    NEW.started_at := COALESCE(NEW.started_at, now());
  ELSIF NEW.status::text = 'completed' THEN
    -- Після завершення прибирання номер ще не готовий до заселення:
    -- він має пройти перевірку. Завершена інспекція одразу підтверджує номер.
    UPDATE public.rooms
    SET housekeeping_status = CASE
      WHEN NEW.task_type = 'inspection'
        THEN 'inspected'::public.room_housekeeping_status
      ELSE 'inspecting'::public.room_housekeeping_status
    END
    WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSIF NEW.status::text = 'inspected' THEN
    -- Фінальну перевірку може підтвердити лише автентифікований працівник.
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Housekeeping inspection requires an authenticated inspector'
        USING ERRCODE = '42501';
    END IF;

    UPDATE public.rooms
    SET housekeeping_status = 'inspected'::public.room_housekeeping_status
    WHERE id = NEW.room_id;
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.inspected_at := COALESCE(NEW.inspected_at, now());
    NEW.inspected_by := COALESCE(NEW.inspected_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_housekeeping_tasks_room_side_effects
  ON public.housekeeping_tasks;
CREATE TRIGGER trg_housekeeping_tasks_room_side_effects
  BEFORE INSERT OR UPDATE OF status, room_id, task_type
  ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_housekeeping_tasks_room_side_effects();

-- ---------------------------------------------------------------------------
-- Технічна служба
-- ---------------------------------------------------------------------------
-- Лише активні заявки з пріоритетом high або urgent блокують експлуатацію
-- номера. Заявки low і normal зберігаються в роботі, але не забороняють
-- продаж або заселення.
CREATE OR REPLACE FUNCTION public.trg_maintenance_requests_room_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_room_blocking boolean := false;
  v_has_active_room_block boolean := false;
  v_status_changed boolean := true;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Запам'ятовуємо, чи стара версія заявки блокувала номер. Це потрібно,
    -- щоб не звільнити номер під час закриття звичайної некритичної заявки.
    v_was_room_blocking :=
      OLD.priority IN ('high', 'urgent')
      AND OLD.status::text NOT IN ('completed', 'cancelled');
    v_status_changed := OLD.status IS DISTINCT FROM NEW.status;
  END IF;

  -- Якщо критичну заявку перенесли до іншого номера, попередній номер можна
  -- звільнити лише за відсутності інших активних критичних заявок.
  IF TG_OP = 'UPDATE'
     AND OLD.room_id IS DISTINCT FROM NEW.room_id
     AND OLD.room_id IS NOT NULL
     AND v_was_room_blocking
     AND NOT EXISTS (
       SELECT 1
       FROM public.maintenance_requests mr
       WHERE mr.room_id = OLD.room_id
         AND mr.id IS DISTINCT FROM NEW.id
         AND mr.priority IN ('high', 'urgent')
         AND mr.status::text NOT IN ('completed', 'cancelled')
     ) THEN
    -- Адміністративне блокування room_blocks має вищий пріоритет:
    -- технічна заявка не повинна скасовувати його автоматично.
    IF to_regclass('public.room_blocks') IS NOT NULL THEN
      EXECUTE
        'SELECT EXISTS (
           SELECT 1
           FROM public.room_blocks
           WHERE room_id = $1
             AND start_date <= current_date
             AND end_date > current_date
         )'
      INTO v_has_active_room_block
      USING OLD.room_id;
    END IF;

    IF NOT v_has_active_room_block THEN
      UPDATE public.rooms
      SET operational_status = 'operational'
      WHERE id = OLD.room_id
        AND operational_status = 'maintenance';
    END IF;
  END IF;

  IF NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Активна критична заявка переводить номер у технічне обслуговування.
  IF NEW.priority IN ('high', 'urgent')
     AND NEW.status::text NOT IN ('completed', 'cancelled') THEN
    UPDATE public.rooms
    SET operational_status = 'maintenance'
    WHERE id = NEW.room_id;
  ELSIF v_was_room_blocking
        AND (
          NEW.status::text IN ('completed', 'cancelled')
          OR NEW.priority NOT IN ('high', 'urgent')
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.maintenance_requests mr
          WHERE mr.room_id = NEW.room_id
            AND mr.id IS DISTINCT FROM NEW.id
            AND mr.priority IN ('high', 'urgent')
            AND mr.status::text NOT IN ('completed', 'cancelled')
        ) THEN
    -- Звільняємо номер після закриття або зниження пріоритету лише тоді,
    -- коли немає іншої критичної заявки чи активного room_blocks.
    IF to_regclass('public.room_blocks') IS NOT NULL THEN
      EXECUTE
        'SELECT EXISTS (
           SELECT 1
           FROM public.room_blocks
           WHERE room_id = $1
             AND start_date <= current_date
             AND end_date > current_date
         )'
      INTO v_has_active_room_block
      USING NEW.room_id;
    END IF;

    UPDATE public.rooms
    SET
      operational_status = CASE
        WHEN v_has_active_room_block THEN operational_status
        ELSE 'operational'::public.room_operational_status
      END,
      housekeeping_status = CASE
        WHEN NEW.status::text = 'completed'
          THEN 'dirty'::public.room_housekeeping_status
        ELSE housekeeping_status
      END
    WHERE id = NEW.room_id;
  ELSIF NEW.status::text = 'completed'
        AND v_status_changed THEN
    -- Після будь-яких завершених технічних робіт номер має пройти
    -- прибирання або контроль господарської служби.
    UPDATE public.rooms
    SET housekeeping_status = 'dirty'::public.room_housekeeping_status
    WHERE id = NEW.room_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_requests_room_side_effects
  ON public.maintenance_requests;
CREATE TRIGGER trg_maintenance_requests_room_side_effects
  AFTER INSERT OR UPDATE OF priority, status, room_id
  ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_maintenance_requests_room_side_effects();

-- Одноразово узгоджуємо історичні дані після застосування міграції:
-- усі номери з активними критичними заявками мають бути в maintenance.
UPDATE public.rooms rooms
SET operational_status = 'maintenance'
WHERE EXISTS (
  SELECT 1
  FROM public.maintenance_requests mr
  WHERE mr.room_id = rooms.id
    AND mr.priority IN ('high', 'urgent')
    AND mr.status::text NOT IN ('completed', 'cancelled')
);
