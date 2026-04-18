export type UserRole =
  | "system_admin" //+
  | "general_manager" // Big boss
  | "front_desk_manager" //+
  | "front_desk_agent" //+
  | "reservations_manager" //i have a question about this role, is it necessary?
  | "housekeeping_supervisor" //+
  | "housekeeping_staff" //+
  | "revenue_manager" //idk what is it
  | "sales_manager" //bullshit role for sales access, not actual sales manager
  | "accountant" //bullshit role for finance access, not actual accountant
  | "maintenance_manager"
  | "maintenance_staff" // too much for maintenance staff
  | "fb_manager" //bullshit

export type RoomStatus = "available" | "occupied" | "dirty" | "cleaning" | "inspected" | "maintenance" | "blocked"

export type ReservationStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show"

export type PaymentStatus = "pending" | "partial" | "paid" | "refunded"

export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer" | "corporate_billing"

export type MaintenanceStatus = "pending" | "in_progress" | "completed" | "cancelled"

export type MaintenancePriority = "low" | "medium" | "high" | "urgent"

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  employee_id?: string
  department?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomType {
  id: string
  name: string
  description?: string
  max_occupancy: number
  base_price: number
  amenities?: Record<string, boolean>
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  room_number: string
  room_type_id: string
  room_type?: RoomType
  floor: number
  status: RoomStatus
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  country?: string
  address?: string
  id_number?: string
  date_of_birth?: string
  notes?: string
  is_vip: boolean
  created_at: string
  updated_at: string
}

export interface RatePlan {
  id: string
  name: string
  description?: string
  rate_type: string
  discount_percentage?: number
  is_active: boolean
  valid_from?: string
  valid_to?: string
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  confirmation_number: string
  guest_id: string
  guest?: Guest
  room_id?: string
  room?: Room
  room_type_id: string
  room_type?: RoomType
  rate_plan_id?: string
  rate_plan?: RatePlan
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  status: ReservationStatus
  total_amount: number
  paid_amount: number
  payment_status: PaymentStatus
  special_requests?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Folio {
  id: string
  reservation_id: string
  reservation?: Reservation
  folio_number: string
  guest_id: string
  guest?: Guest
  total_amount: number
  paid_amount: number
  balance: number
  status: PaymentStatus
  is_closed: boolean
  created_at: string
  updated_at: string
}

export interface FolioCharge {
  id: string
  folio_id: string
  description: string
  charge_type: string
  amount: number
  quantity: number
  charge_date: string
  created_by?: string
  created_at: string
}

export interface Payment {
  id: string
  folio_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference_number?: string
  notes?: string
  processed_by?: string
  created_at: string
}

export interface HousekeepingTask {
  id: string
  room_id: string
  room?: Room
  assigned_to?: string
  assigned_user?: Profile
  task_type: string
  priority: string
  status: string
  notes?: string
  assigned_at?: string
  completed_at?: string
  created_at: string
}

export interface MaintenanceRequest {
  id: string
  room_id?: string
  room?: Room
  title: string
  description: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  assigned_to?: string
  assigned_user?: Profile
  reported_by?: string
  reporter?: Profile
  resolved_at?: string
  created_at: string
  updated_at: string
}
