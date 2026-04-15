-- Row Level Security Policies for Grand Oasis Hotel PMS

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (get_user_role() IN ('system_administrator', 'general_manager'));

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (get_user_role() = 'system_administrator');

-- Guests table policies
CREATE POLICY "Staff can view guests"
  ON guests FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Front desk and managers can manage guests"
  ON guests FOR ALL
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'front_desk_agent', 'reservations_manager'));

-- Rooms and room types policies
CREATE POLICY "All staff can view rooms"
  ON rooms FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Managers and housekeeping can update room status"
  ON rooms FOR UPDATE
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'housekeeping_supervisor', 'housekeeping_staff'));

CREATE POLICY "Admins can manage rooms"
  ON rooms FOR ALL
  USING (get_user_role() IN ('system_administrator', 'general_manager'));

CREATE POLICY "All staff can view room types"
  ON room_types FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Managers can manage room types"
  ON room_types FOR ALL
  USING (get_user_role() IN ('system_administrator', 'general_manager', 'revenue_manager'));

-- Rate plans policies
CREATE POLICY "All staff can view rate plans"
  ON rate_plans FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Managers can manage rate plans"
  ON rate_plans FOR ALL
  USING (get_user_role() IN ('system_administrator', 'revenue_manager', 'general_manager', 'reservations_manager'));

-- Reservations policies
CREATE POLICY "Staff can view reservations"
  ON reservations FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Front desk can manage reservations"
  ON reservations FOR ALL
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'front_desk_agent', 'reservations_manager'));

-- Reservation rooms policies
CREATE POLICY "Staff can view reservation rooms"
  ON reservation_rooms FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Front desk can manage reservation rooms"
  ON reservation_rooms FOR ALL
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'front_desk_agent', 'reservations_manager'));

-- Payments policies
CREATE POLICY "Staff can view payments"
  ON payments FOR SELECT
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'front_desk_agent', 'accountant', 'general_manager'));

CREATE POLICY "Authorized staff can process payments"
  ON payments FOR INSERT
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'front_desk_agent', 'accountant'));

-- Folios policies
CREATE POLICY "Staff can view folios"
  ON folios FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Authorized staff can manage folios"
  ON folios FOR ALL
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'front_desk_agent', 'accountant'));

-- Folio charges policies
CREATE POLICY "Staff can view folio charges"
  ON folio_charges FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Authorized staff can add charges"
  ON folio_charges FOR INSERT
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'front_desk_agent', 'accountant', 'fb_manager'));

-- Housekeeping tasks policies
CREATE POLICY "Staff can view housekeeping tasks"
  ON housekeeping_tasks FOR SELECT
  USING (get_user_role() IN ('system_administrator', 'front_desk_manager', 'housekeeping_supervisor', 'housekeeping_staff'));

CREATE POLICY "Housekeeping can manage tasks"
  ON housekeeping_tasks FOR ALL
  USING (get_user_role() IN ('system_administrator', 'housekeeping_supervisor', 'housekeeping_staff'));

-- Maintenance requests policies
CREATE POLICY "Staff can view maintenance requests"
  ON maintenance_requests FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Staff can create maintenance requests"
  ON maintenance_requests FOR INSERT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Maintenance staff can manage requests"
  ON maintenance_requests FOR ALL
  USING (get_user_role() IN ('system_administrator', 'maintenance_manager', 'maintenance_staff'));

-- Services policies
CREATE POLICY "Staff can view services"
  ON services FOR SELECT
  USING (get_user_role() IS NOT NULL);

CREATE POLICY "Managers can manage services"
  ON services FOR ALL
  USING (get_user_role() IN ('system_administrator', 'general_manager', 'revenue_manager'));

-- Inventory policies
CREATE POLICY "Staff can view inventory"
  ON inventory_items FOR SELECT
  USING (get_user_role() IN ('system_administrator', 'housekeeping_supervisor', 'maintenance_manager', 'general_manager'));

CREATE POLICY "Supervisors can manage inventory"
  ON inventory_items FOR ALL
  USING (get_user_role() IN ('system_administrator', 'housekeeping_supervisor', 'maintenance_manager'));

CREATE POLICY "Staff can view inventory transactions"
  ON inventory_transactions FOR SELECT
  USING (get_user_role() IN ('system_administrator', 'housekeeping_supervisor', 'maintenance_manager', 'general_manager'));

CREATE POLICY "Supervisors can log inventory transactions"
  ON inventory_transactions FOR INSERT
  USING (get_user_role() IN ('system_administrator', 'housekeeping_supervisor', 'maintenance_manager'));

-- Audit logs policies
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (get_user_role() IN ('system_administrator', 'general_manager'));

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  USING (true);

-- Notifications policies
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  USING (true);
