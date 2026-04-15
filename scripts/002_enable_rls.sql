-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folio_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'general_manager')
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'general_manager')
    )
  );

-- Room types policies (readable by all authenticated users)
CREATE POLICY "Authenticated users can view room types"
  ON public.room_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage room types"
  ON public.room_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'general_manager', 'front_desk_manager', 'reservations_manager')
    )
  );

-- Rooms policies
CREATE POLICY "Authenticated users can view rooms"
  ON public.rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update room status"
  ON public.rooms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'front_desk_manager', 'front_desk_agent', 'housekeeping_supervisor', 'housekeeping_staff')
    )
  );

-- Guests policies
CREATE POLICY "Staff can view guests"
  ON public.guests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage guests"
  ON public.guests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'front_desk_manager', 'front_desk_agent', 'reservations_manager')
    )
  );

-- Reservations policies
CREATE POLICY "Staff can view reservations"
  ON public.reservations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage reservations"
  ON public.reservations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'general_manager', 'front_desk_manager', 'front_desk_agent', 'reservations_manager')
    )
  );

-- Folios policies
CREATE POLICY "Staff can view folios"
  ON public.folios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage folios"
  ON public.folios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'front_desk_manager', 'front_desk_agent', 'accountant')
    )
  );

-- Folio charges policies
CREATE POLICY "Staff can view folio charges"
  ON public.folio_charges FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can add folio charges"
  ON public.folio_charges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'front_desk_manager', 'front_desk_agent', 'accountant')
    )
  );

-- Payments policies
CREATE POLICY "Staff can view payments"
  ON public.payments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can process payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'front_desk_manager', 'front_desk_agent', 'accountant')
    )
  );

-- Housekeeping tasks policies
CREATE POLICY "Housekeeping staff can view their tasks"
  ON public.housekeeping_tasks FOR SELECT
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'housekeeping_supervisor')
    )
  );

CREATE POLICY "Housekeeping supervisors can manage tasks"
  ON public.housekeeping_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'housekeeping_supervisor')
    )
  );

-- Maintenance requests policies
CREATE POLICY "Staff can view maintenance requests"
  ON public.maintenance_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can create maintenance requests"
  ON public.maintenance_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Maintenance staff can update requests"
  ON public.maintenance_requests FOR UPDATE
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'maintenance_manager', 'housekeeping_supervisor')
    )
  );

-- Rate plans policies
CREATE POLICY "Staff can view rate plans"
  ON public.rate_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage rate plans"
  ON public.rate_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'general_manager', 'revenue_manager')
    )
  );

-- Audit logs policies (read-only for admins)
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('system_admin', 'general_manager')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);
