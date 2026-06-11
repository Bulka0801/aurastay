-- ============================================================================
-- Migration: housekeeping_profiles_visibility_policy.sql
-- Project: AuraStay
--
-- Призначення:
-- Ця міграція додає контрольовану видимість профілів працівників для модуля
-- господарської служби.
--
-- Важливо для поточної БД:
-- У деяких інсталяціях public.profiles є VIEW над реальною таблицею
-- public.users або public."user". PostgreSQL не дозволяє створювати RLS policy
-- на view, тому ця міграція автоматично визначає, куди застосувати політики:
--   - якщо public.profiles є таблицею, policy створюється на public.profiles;
--   - якщо public.profiles є view, policy створюється на базовій таблиці
--     public.users або public."user", а view переводиться в security_invoker.
--
-- Бізнес-причина:
-- Супервайзер господарської служби є операційним керівником для покоївок
-- і технічного персоналу. Він має бачити активних працівників в інтерфейсі,
-- щоб:
--   1) призначати завдання з прибирання покоївкам;
--   2) створювати технічні заявки та призначати їх maintenance_staff;
--   3) відображати імена призначених виконавців у картках/таблицях завдань;
--   4) фільтрувати завдання за призначеним працівником;
--   5) керувати операційним процесом без надання доступу до всіх користувачів.
--
-- Модель безпеки:
--   - system_administrator і general_manager можуть переглядати всі профілі;
--   - housekeeping_supervisor може переглядати тільки профілі, пов'язані
--     з господарською службою та технічним персоналом;
--   - housekeeping_staff і maintenance_staff не отримують права переглядати
--     всі профілі персоналу через цю політику;
--   - maintenance_manager поки не використовується в поточній реалізації.
-- ============================================================================


-- ============================================================================
-- 1. Допоміжна функція: current_profile_role()
-- ============================================================================

-- Функція повертає роль поточного автентифікованого користувача.
-- Вона читає роль через public.profiles, бо програмний код також працює з цим
-- контрактом. Якщо profiles є view, SECURITY DEFINER дозволяє уникнути проблем
-- із RLS під час перевірки ролі в policy.
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


-- ============================================================================
-- 2. Політики видимості профілів
-- ============================================================================

DO $$
DECLARE
  profiles_kind text;
  policy_target regclass;
BEGIN
  SELECT c.relkind
  INTO profiles_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'profiles';

  IF profiles_kind IS NULL THEN
    RAISE EXCEPTION 'public.profiles does not exist';
  END IF;

  IF profiles_kind IN ('r', 'p') THEN
    -- public.profiles is a real table or partitioned table.
    policy_target := 'public.profiles'::regclass;
  ELSIF profiles_kind = 'v' THEN
    -- public.profiles is a view. Policies must be created on the base table.
    IF to_regclass('public.users') IS NOT NULL THEN
      policy_target := 'public.users'::regclass;
    ELSIF to_regclass('public."user"') IS NOT NULL THEN
      policy_target := 'public."user"'::regclass;
    ELSE
      RAISE EXCEPTION 'public.profiles is a view, but neither public.users nor public."user" exists';
    END IF;

    -- Make the view respect permissions/RLS of the querying user instead of
    -- always using the view owner's privileges.
    EXECUTE 'ALTER VIEW public.profiles SET (security_invoker = true)';
  ELSE
    RAISE EXCEPTION 'public.profiles has unsupported relkind: %', profiles_kind;
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', policy_target);

  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON %s',
    'Housekeeping supervisors can view housekeeping profiles',
    policy_target
  );

  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON %s',
    'Admins can view all profiles',
    policy_target
  );

  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT USING (
      public.current_profile_role() IN (''system_administrator'', ''general_manager'')
    )',
    'Admins can view all profiles',
    policy_target
  );

  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT USING (
      role IN (''housekeeping_staff'', ''housekeeping_supervisor'', ''maintenance_staff'')
      AND public.current_profile_role() IN (''system_administrator'', ''housekeeping_supervisor'')
    )',
    'Housekeeping supervisors can view housekeeping profiles',
    policy_target
  );
END $$;
