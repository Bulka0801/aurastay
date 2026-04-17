-- =====================================================
-- AuraStay HMS - Row Level Security Policies
-- Політики безпеки на рівні рядків
-- =====================================================

-- =====================================================
-- ENABLE RLS / УВІМКНЕННЯ RLS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS / ДОПОМІЖНІ ФУНКЦІЇ
-- =====================================================

-- Отримати роль поточного користувача
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role_value;
END;
$$;

-- Перевірка чи є користувач адміністратором або менеджером
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() IN ('admin', 'manager');
END;
$$;

-- Перевірка чи є користувач працівником рецепції
CREATE OR REPLACE FUNCTION public.is_receptionist_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() IN ('admin', 'manager', 'receptionist');
END;
$$;

-- Перевірка чи є користувач покоївкою
CREATE OR REPLACE FUNCTION public.is_housekeeper()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() = 'housekeeper';
END;
$$;

-- Перевірка чи є користувач технічним персоналом
CREATE OR REPLACE FUNCTION public.is_maintenance()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role() = 'maintenance';
END;
$$;

-- =====================================================
-- PROFILES POLICIES / ПОЛІТИКИ ПРОФІЛІВ
-- =====================================================

-- Всі автентифіковані користувачі можуть читати профілі
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Користувачі можуть оновлювати тільки свій профіль
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Тільки адміністратори можуть оновлювати ролі інших
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- =====================================================
-- ROOM TYPES POLICIES / ПОЛІТИКИ ТИПІВ НОМЕРІВ
-- =====================================================

CREATE POLICY "room_types_select"
  ON public.room_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "room_types_insert"
  ON public.room_types FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "room_types_update"
  ON public.room_types FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "room_types_delete"
  ON public.room_types FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- FLOORS POLICIES / ПОЛІТИКИ ПОВЕРХІВ
-- =====================================================

CREATE POLICY "floors_select"
  ON public.floors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "floors_insert"
  ON public.floors FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "floors_update"
  ON public.floors FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- =====================================================
-- ROOMS POLICIES / ПОЛІТИКИ НОМЕРІВ
-- =====================================================

CREATE POLICY "rooms_select"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rooms_insert"
  ON public.rooms FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "rooms_update"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_manager() 
    OR public.is_receptionist_or_above()
    OR public.is_housekeeper()
    OR public.is_maintenance()
  );

CREATE POLICY "rooms_delete"
  ON public.rooms FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- AMENITIES POLICIES / ПОЛІТИКИ ЗРУЧНОСТЕЙ
-- =====================================================

CREATE POLICY "amenities_select"
  ON public.amenities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "amenities_insert"
  ON public.amenities FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "amenities_update"
  ON public.amenities FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- =====================================================
-- ROOM AMENITIES POLICIES
-- =====================================================

CREATE POLICY "room_amenities_select"
  ON public.room_amenities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "room_amenities_insert"
  ON public.room_amenities FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "room_amenities_delete"
  ON public.room_amenities FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- GUESTS POLICIES / ПОЛІТИКИ ГОСТЕЙ
-- =====================================================

CREATE POLICY "guests_select"
  ON public.guests FOR SELECT
  TO authenticated
  USING (public.is_receptionist_or_above() OR public.is_admin_or_manager());

CREATE POLICY "guests_insert"
  ON public.guests FOR INSERT
  TO authenticated
  WITH CHECK (public.is_receptionist_or_above());

CREATE POLICY "guests_update"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (public.is_receptionist_or_above())
  WITH CHECK (public.is_receptionist_or_above());

CREATE POLICY "guests_delete"
  ON public.guests FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- RESERVATIONS POLICIES / ПОЛІТИКИ БРОНЮВАНЬ
-- =====================================================

CREATE POLICY "reservations_select"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (
    public.is_receptionist_or_above() 
    OR public.is_admin_or_manager()
    -- Покоївки бачать бронювання для своїх завдань
    OR public.is_housekeeper()
  );

CREATE POLICY "reservations_insert"
  ON public.reservations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_receptionist_or_above());

CREATE POLICY "reservations_update"
  ON public.reservations FOR UPDATE
  TO authenticated
  USING (public.is_receptionist_or_above())
  WITH CHECK (public.is_receptionist_or_above());

CREATE POLICY "reservations_delete"
  ON public.reservations FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- RESERVATION GUESTS POLICIES
-- =====================================================

CREATE POLICY "reservation_guests_select"
  ON public.reservation_guests FOR SELECT
  TO authenticated
  USING (public.is_receptionist_or_above());

CREATE POLICY "reservation_guests_insert"
  ON public.reservation_guests FOR INSERT
  TO authenticated
  WITH CHECK (public.is_receptionist_or_above());

CREATE POLICY "reservation_guests_delete"
  ON public.reservation_guests FOR DELETE
  TO authenticated
  USING (public.is_receptionist_or_above());

-- =====================================================
-- PAYMENTS POLICIES / ПОЛІТИКИ ОПЛАТ
-- =====================================================

CREATE POLICY "payments_select"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_receptionist_or_above() OR public.is_admin_or_manager());

CREATE POLICY "payments_insert"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_receptionist_or_above());

-- Оплати не можна видаляти, тільки адміни можуть бачити історію
CREATE POLICY "payments_delete"
  ON public.payments FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- STATUS HISTORY POLICIES / ПОЛІТИКИ ІСТОРІЇ СТАТУСІВ
-- =====================================================

CREATE POLICY "reservation_status_history_select"
  ON public.reservation_status_history FOR SELECT
  TO authenticated
  USING (public.is_receptionist_or_above() OR public.is_admin_or_manager());

CREATE POLICY "room_status_history_select"
  ON public.room_status_history FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- HOUSEKEEPING POLICIES / ПОЛІТИКИ ПРИБИРАННЯ
-- =====================================================

CREATE POLICY "housekeeping_select"
  ON public.housekeeping_tasks FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager()
    OR public.is_receptionist_or_above()
    OR public.is_housekeeper()
  );

CREATE POLICY "housekeeping_insert"
  ON public.housekeeping_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_receptionist_or_above()
  );

-- Покоївки можуть оновлювати тільки свої завдання
CREATE POLICY "housekeeping_update_own"
  ON public.housekeeping_tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_manager()
    OR public.is_receptionist_or_above()
    OR (public.is_housekeeper() AND assigned_to = auth.uid())
  );

CREATE POLICY "housekeeping_delete"
  ON public.housekeeping_tasks FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- MAINTENANCE POLICIES / ПОЛІТИКИ ТЕХОБСЛУГОВУВАННЯ
-- =====================================================

CREATE POLICY "maintenance_select"
  ON public.maintenance_tasks FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager()
    OR public.is_receptionist_or_above()
    OR public.is_maintenance()
  );

CREATE POLICY "maintenance_insert"
  ON public.maintenance_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_manager()
    OR public.is_receptionist_or_above()
    OR public.is_maintenance()
  );

-- Технічний персонал може оновлювати тільки свої завдання
CREATE POLICY "maintenance_update"
  ON public.maintenance_tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_manager()
    OR public.is_receptionist_or_above()
    OR (public.is_maintenance() AND assigned_to = auth.uid())
  );

CREATE POLICY "maintenance_delete"
  ON public.maintenance_tasks FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager());

-- =====================================================
-- AUDIT LOG POLICIES / ПОЛІТИКИ ЖУРНАЛУ АУДИТУ
-- =====================================================

-- Тільки адміни можуть бачити журнал аудиту
CREATE POLICY "audit_log_select"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager());

-- Вставка відбувається через тригери
CREATE POLICY "audit_log_insert"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- SETTINGS POLICIES / ПОЛІТИКИ НАЛАШТУВАНЬ
-- =====================================================

CREATE POLICY "settings_select"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "settings_insert"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "settings_update"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());
