-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at
  BEFORE UPDATE ON public.room_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    role,
    employee_id,
    department
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'front_desk_agent'),
    NEW.raw_user_meta_data->>'employee_id',
    NEW.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to generate confirmation number
CREATE OR REPLACE FUNCTION generate_confirmation_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'GR' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.reservations WHERE confirmation_number = new_number) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate folio number
CREATE OR REPLACE FUNCTION generate_folio_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    new_number := 'FO' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.folios WHERE folio_number = new_number) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set confirmation number on insert
CREATE OR REPLACE FUNCTION set_confirmation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confirmation_number IS NULL OR NEW.confirmation_number = '' THEN
    NEW.confirmation_number := generate_confirmation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reservation_confirmation_number
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION set_confirmation_number();

-- Trigger to set folio number on insert
CREATE OR REPLACE FUNCTION set_folio_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio_number IS NULL OR NEW.folio_number = '' THEN
    NEW.folio_number := generate_folio_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_folio_folio_number
  BEFORE INSERT ON public.folios
  FOR EACH ROW
  EXECUTE FUNCTION set_folio_number();

-- Function to update folio balance
CREATE OR REPLACE FUNCTION update_folio_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.folios
  SET 
    total_amount = (
      SELECT COALESCE(SUM(amount * quantity), 0)
      FROM public.folio_charges
      WHERE folio_id = NEW.folio_id
    ),
    balance = (
      SELECT COALESCE(SUM(amount * quantity), 0)
      FROM public.folio_charges
      WHERE folio_id = NEW.folio_id
    ) - (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.payments
      WHERE folio_id = NEW.folio_id
    )
  WHERE id = NEW.folio_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_folio_on_charge
  AFTER INSERT ON public.folio_charges
  FOR EACH ROW
  EXECUTE FUNCTION update_folio_balance();

CREATE TRIGGER update_folio_on_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_folio_balance();
