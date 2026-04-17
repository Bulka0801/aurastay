-- =====================================================
-- AuraStay HMS - Triggers and Functions
-- Тригери та функції для бізнес-логіки
-- =====================================================

-- =====================================================
-- UTILITY FUNCTIONS / ДОПОМІЖНІ ФУНКЦІЇ
-- =====================================================

-- Функція оновлення updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Генерація номера підтвердження бронювання
CREATE OR REPLACE FUNCTION public.generate_confirmation_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  prefix TEXT;
  seq_num INTEGER;
BEGIN
  prefix := 'AS' || TO_CHAR(NOW(), 'YYMM');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(confirmation_number FROM 7) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.reservations
  WHERE confirmation_number LIKE prefix || '%';
  
  new_number := prefix || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- =====================================================
-- PROFILE TRIGGER (Auto-create on signup)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'receptionist')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RESERVATION BUSINESS RULES / ПРАВИЛА БРОНЮВАННЯ
-- =====================================================

-- Валідація переходу статусу бронювання
CREATE OR REPLACE FUNCTION public.validate_reservation_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Якщо статус не змінився, дозволяємо
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Правила переходів статусів бронювання
  -- pending -> confirmed, cancelled
  -- confirmed -> checked_in, cancelled, no_show
  -- checked_in -> checked_out
  -- checked_out -> (фінальний статус)
  -- cancelled -> (фінальний статус)
  -- no_show -> (фінальний статус)

  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Неможливо змінити статус з "Очікує" на "%". Дозволено: Підтверджено, Скасовано', NEW.status;
      END IF;
    
    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('checked_in', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Неможливо змінити статус з "Підтверджено" на "%". Дозволено: Заселено, Скасовано, Неявка', NEW.status;
      END IF;
      
      -- Перевірка на no_show: тільки після дати заїзду
      IF NEW.status = 'no_show' AND NEW.check_in_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Неможливо встановити "Неявка" до настання дати заїзду';
      END IF;
    
    WHEN 'checked_in' THEN
      IF NEW.status != 'checked_out' THEN
        RAISE EXCEPTION 'Неможливо змінити статус з "Заселено" на "%". Дозволено тільки: Виселено', NEW.status;
      END IF;
    
    WHEN 'checked_out' THEN
      RAISE EXCEPTION 'Статус "Виселено" є фінальним і не може бути змінений';
    
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Статус "Скасовано" є фінальним і не може бути змінений';
    
    WHEN 'no_show' THEN
      RAISE EXCEPTION 'Статус "Неявка" є фінальним і не може бути змінений';
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_reservation_status ON public.reservations;
CREATE TRIGGER validate_reservation_status
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation_status_transition();

-- Логування змін статусу бронювання
CREATE OR REPLACE FUNCTION public.log_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.reservation_status_history (
      reservation_id,
      old_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NEW.cancellation_reason
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_reservation_status ON public.reservations;
CREATE TRIGGER log_reservation_status
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_reservation_status_change();

-- Автоматичне заповнення номера підтвердження
CREATE OR REPLACE FUNCTION public.set_confirmation_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.confirmation_number IS NULL OR NEW.confirmation_number = '' THEN
    NEW.confirmation_number := public.generate_confirmation_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_reservation_confirmation ON public.reservations;
CREATE TRIGGER set_reservation_confirmation
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_confirmation_number();

-- Оновлення статусу оплати при додаванні платежу
CREATE OR REPLACE FUNCTION public.update_reservation_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_paid DECIMAL(12,2);
  reservation_total DECIMAL(12,2);
BEGIN
  SELECT SUM(amount) INTO total_paid
  FROM public.payments
  WHERE reservation_id = NEW.reservation_id;

  SELECT total_amount INTO reservation_total
  FROM public.reservations
  WHERE id = NEW.reservation_id;

  UPDATE public.reservations
  SET 
    paid_amount = COALESCE(total_paid, 0),
    payment_status = CASE
      WHEN COALESCE(total_paid, 0) >= reservation_total THEN 'paid'
      WHEN COALESCE(total_paid, 0) > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = NEW.reservation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_payment_status ON public.payments;
CREATE TRIGGER update_payment_status
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reservation_payment();

-- =====================================================
-- ROOM STATUS BUSINESS RULES / ПРАВИЛА СТАТУСУ НОМЕРА
-- =====================================================

-- Валідація переходу статусу номера
CREATE OR REPLACE FUNCTION public.validate_room_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Правила переходів статусів номера
  -- available -> occupied, cleaning, maintenance, out_of_order
  -- occupied -> dirty, maintenance (при екстрених випадках)
  -- dirty -> cleaning, maintenance
  -- cleaning -> available, dirty (якщо щось не так), maintenance
  -- maintenance -> available, dirty
  -- out_of_order -> maintenance, available

  CASE OLD.status
    WHEN 'available' THEN
      IF NEW.status NOT IN ('occupied', 'cleaning', 'maintenance', 'out_of_order') THEN
        RAISE EXCEPTION 'Неможливо змінити статус номера з "Вільний" на "%"', NEW.status;
      END IF;
    
    WHEN 'occupied' THEN
      IF NEW.status NOT IN ('dirty', 'maintenance') THEN
        RAISE EXCEPTION 'Неможливо змінити статус номера з "Зайнятий" на "%". Дозволено: Брудний, На обслуговуванні', NEW.status;
      END IF;
    
    WHEN 'dirty' THEN
      IF NEW.status NOT IN ('cleaning', 'maintenance') THEN
        RAISE EXCEPTION 'Неможливо змінити статус номера з "Брудний" на "%". Дозволено: На прибиранні, На обслуговуванні', NEW.status;
      END IF;
    
    WHEN 'cleaning' THEN
      IF NEW.status NOT IN ('available', 'dirty', 'maintenance') THEN
        RAISE EXCEPTION 'Неможливо змінити статус номера з "На прибиранні" на "%"', NEW.status;
      END IF;
    
    WHEN 'maintenance' THEN
      IF NEW.status NOT IN ('available', 'dirty', 'out_of_order') THEN
        RAISE EXCEPTION 'Неможливо змінити статус номера з "На обслуговуванні" на "%"', NEW.status;
      END IF;
    
    WHEN 'out_of_order' THEN
      IF NEW.status NOT IN ('maintenance', 'available') THEN
        RAISE EXCEPTION 'Неможливо змінити статус номера з "Виведено з експлуатації" на "%"', NEW.status;
      END IF;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_room_status ON public.rooms;
CREATE TRIGGER validate_room_status
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_room_status_transition();

-- Логування змін статусу номера
CREATE OR REPLACE FUNCTION public.log_room_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.room_status_history (
      room_id,
      old_status,
      new_status,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NEW.notes
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_room_status ON public.rooms;
CREATE TRIGGER log_room_status
  AFTER UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.log_room_status_change();

-- =====================================================
-- CHECK-IN / CHECK-OUT AUTOMATION
-- =====================================================

-- При заселенні: оновити статус номера на 'occupied'
CREATE OR REPLACE FUNCTION public.handle_check_in()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'checked_in' THEN
    -- Встановлюємо час фактичного заселення
    NEW.actual_check_in := COALESCE(NEW.actual_check_in, NOW());
    
    -- Перевіряємо, чи призначено номер
    IF NEW.room_id IS NULL THEN
      RAISE EXCEPTION 'Неможливо заселити без призначення номера';
    END IF;
    
    -- Оновлюємо статус номера на 'occupied'
    UPDATE public.rooms
    SET 
      status = 'occupied',
      current_reservation_id = NEW.id,
      updated_at = NOW()
    WHERE id = NEW.room_id;
    
    -- Оновлюємо статистику гостя
    UPDATE public.guests
    SET 
      total_stays = total_stays + 1,
      updated_at = NOW()
    WHERE id = NEW.guest_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_reservation_check_in ON public.reservations;
CREATE TRIGGER handle_reservation_check_in
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_check_in();

-- При виселенні: оновити статус номера на 'dirty'
CREATE OR REPLACE FUNCTION public.handle_check_out()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'checked_in' AND NEW.status = 'checked_out' THEN
    -- Встановлюємо час фактичного виселення
    NEW.actual_check_out := COALESCE(NEW.actual_check_out, NOW());
    
    -- Оновлюємо статус номера на 'dirty' та створюємо завдання прибирання
    UPDATE public.rooms
    SET 
      status = 'dirty',
      current_reservation_id = NULL,
      updated_at = NOW()
    WHERE id = NEW.room_id;
    
    -- Створюємо завдання прибирання після виїзду
    INSERT INTO public.housekeeping_tasks (
      room_id,
      task_type,
      status,
      priority,
      scheduled_date,
      created_by
    ) VALUES (
      NEW.room_id,
      'checkout',
      'pending',
      'high',
      CURRENT_DATE,
      auth.uid()
    );
    
    -- Оновлюємо загальну суму витрат гостя
    UPDATE public.guests
    SET 
      total_spent = total_spent + NEW.paid_amount,
      updated_at = NOW()
    WHERE id = NEW.guest_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_reservation_check_out ON public.reservations;
CREATE TRIGGER handle_reservation_check_out
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_check_out();

-- =====================================================
-- HOUSEKEEPING AUTOMATION / АВТОМАТИЗАЦІЯ ПРИБИРАННЯ
-- =====================================================

-- При завершенні прибирання: оновити статус номера
CREATE OR REPLACE FUNCTION public.handle_housekeeping_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    
    -- Оновлюємо статус номера на 'available' якщо він був на прибиранні
    UPDATE public.rooms
    SET 
      status = 'available',
      updated_at = NOW()
    WHERE id = NEW.room_id 
      AND status = 'cleaning';
  END IF;
  
  -- При початку прибирання
  IF OLD.status = 'pending' AND NEW.status = 'in_progress' THEN
    NEW.started_at := COALESCE(NEW.started_at, NOW());
    
    -- Оновлюємо статус номера на 'cleaning'
    UPDATE public.rooms
    SET 
      status = 'cleaning',
      updated_at = NOW()
    WHERE id = NEW.room_id 
      AND status IN ('dirty', 'available');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_housekeeping_status ON public.housekeeping_tasks;
CREATE TRIGGER handle_housekeeping_status
  BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_housekeeping_completion();

-- =====================================================
-- MAINTENANCE AUTOMATION / АВТОМАТИЗАЦІЯ ОБСЛУГОВУВАННЯ
-- =====================================================

-- При створенні/завершенні технічного завдання
CREATE OR REPLACE FUNCTION public.handle_maintenance_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- При призначенні завдання
  IF OLD.status = 'reported' AND NEW.status = 'assigned' THEN
    -- Можливо оновити статус номера на 'maintenance' якщо пріоритет високий
    IF NEW.priority IN ('high', 'urgent') AND NEW.room_id IS NOT NULL THEN
      UPDATE public.rooms
      SET 
        status = 'maintenance',
        updated_at = NOW()
      WHERE id = NEW.room_id 
        AND status NOT IN ('occupied', 'out_of_order');
    END IF;
  END IF;
  
  -- При початку роботи
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    NEW.started_at := COALESCE(NEW.started_at, NOW());
  END IF;
  
  -- При завершенні
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    
    -- Повертаємо номер до стану 'dirty' для прибирання
    IF NEW.room_id IS NOT NULL THEN
      UPDATE public.rooms
      SET 
        status = 'dirty',
        updated_at = NOW()
      WHERE id = NEW.room_id 
        AND status = 'maintenance';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_maintenance_status ON public.maintenance_tasks;
CREATE TRIGGER handle_maintenance_status
  BEFORE UPDATE ON public.maintenance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_maintenance_status();

-- =====================================================
-- AVAILABILITY CHECK FUNCTION
-- Функція перевірки доступності номера
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM public.reservations
  WHERE room_id = p_room_id
    AND status IN ('pending', 'confirmed', 'checked_in')
    AND id != COALESCE(p_exclude_reservation_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (check_in_date < p_check_out AND check_out_date > p_check_in)
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- Функція отримання доступних номерів
CREATE OR REPLACE FUNCTION public.get_available_rooms(
  p_check_in DATE,
  p_check_out DATE,
  p_room_type_id UUID DEFAULT NULL,
  p_guests INTEGER DEFAULT 1
)
RETURNS TABLE (
  room_id UUID,
  room_number TEXT,
  room_type_name TEXT,
  floor_number INTEGER,
  base_price DECIMAL(10,2),
  max_occupancy INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.room_number,
    rt.name_uk,
    f.number,
    rt.base_price,
    rt.max_occupancy
  FROM public.rooms r
  JOIN public.room_types rt ON r.room_type_id = rt.id
  LEFT JOIN public.floors f ON r.floor_id = f.id
  WHERE r.is_active = true
    AND r.status NOT IN ('out_of_order', 'maintenance')
    AND rt.max_occupancy >= p_guests
    AND (p_room_type_id IS NULL OR r.room_type_id = p_room_type_id)
    AND public.check_room_availability(r.id, p_check_in, p_check_out)
  ORDER BY rt.base_price, r.room_number;
END;
$$;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_room_types_updated_at
  BEFORE UPDATE ON public.room_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_housekeeping_updated_at
  BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
