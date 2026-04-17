/**
 * Типи даних HMS.
 * УВАГА: значення енамів тут збігаються зі справжньою схемою в БД
 * (scripts/001-create-database-schema.sql). Якщо додаєте значення —
 * спершу ALTER TYPE у БД, потім оновлюйте тут.
 */

export type UserRole =
  | "system_administrator"
  | "general_manager"
  | "front_desk_manager"
  | "front_desk_agent"
  | "reservations_manager"
  | "housekeeping_supervisor"
  | "housekeeping_staff"
  | "revenue_manager"
  | "sales_manager"
  | "accountant"
  | "maintenance_manager"
  | "maintenance_staff"
  | "fb_manager"

export type RoomStatus =
  | "available"
  | "occupied"
  | "dirty"
  | "cleaning"
  | "inspecting"
  | "maintenance"
  | "out_of_order"
  | "blocked"

export type ReservationStatus = "confirmed" | "pending" | "checked_in" | "checked_out" | "cancelled" | "no_show"

export type PaymentStatus = "pending" | "paid" | "partial" | "refunded" | "failed"

export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer" | "corporate_account"

export type MaintenanceStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled"

export type MaintenancePriority = "low" | "medium" | "high" | "urgent"

export type HousekeepingTaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "inspected"

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
  code: string
  description?: string
  base_occupancy: number
  max_occupancy: number
  base_rate: number
  amenities?: string[]
  size_sqm?: number
  bed_type?: string
  image_urls?: string[]
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
  is_smoking?: boolean
  has_disability_access?: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  passport_number?: string
  id_number?: string
  nationality?: string
  date_of_birth?: string
  address?: string
  city?: string
  country?: string
  postal_code?: string
  company?: string
  is_vip: boolean
  loyalty_tier?: string
  preferences?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface RatePlan {
  id: string
  name: string
  code: string
  description?: string
  is_default: boolean
  discount_percentage: number
  cancellation_policy?: string
  deposit_policy?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ReservationRoom {
  id: string
  reservation_id: string
  room_id?: string
  room_type_id: string
  rate: number
  /** Поле зʼявляється після міграції 005; поки що може бути undefined. */
  start_date?: string
  end_date?: string
  moved_from_room_id?: string
  check_in_time?: string
  check_out_time?: string
  actual_check_in?: string
  actual_check_out?: string
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  reservation_number: string
  guest_id: string
  guest?: Guest
  check_in_date: string
  check_out_date: string
  adults: number
  children: number
  status: ReservationStatus
  rate_plan_id?: string
  rate_plan?: RatePlan
  total_amount: number
  paid_amount: number
  balance?: number
  special_requests?: string
  notes?: string
  channel?: string
  created_by?: string
  created_at: string
  updated_at: string
  cancelled_at?: string
  cancellation_reason?: string
}

export interface Folio {
  id: string
  folio_number: string
  reservation_id: string
  reservation?: Reservation
  guest_id: string
  guest?: Guest
  total_amount: number
  tax_amount: number
  discount_amount: number
  grand_total?: number
  status: PaymentStatus
  issued_date: string
  due_date?: string
  created_at: string
  updated_at: string
}

export interface FolioCharge {
  id: string
  folio_id: string
  description: string
  amount: number
  quantity: number
  charge_date: string
  category?: string
  posted_by?: string
  created_at: string
}

export interface Payment {
  id: string
  reservation_id: string
  amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  transaction_id?: string
  card_last_four?: string
  payment_date: string
  processed_by?: string
  notes?: string
  created_at: string
}

export interface HousekeepingTask {
  id: string
  room_id: string
  room?: Room
  assigned_to?: string
  assigned_user?: Profile
  status: HousekeepingTaskStatus
  task_type: string
  priority: string
  scheduled_date: string
  started_at?: string
  completed_at?: string
  inspected_at?: string
  inspected_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface MaintenanceRequest {
  id: string
  request_number: string
  room_id?: string
  room?: Room
  title?: string
  description: string
  priority: MaintenancePriority | string
  status: MaintenanceStatus
  category?: string
  resolution?: string
  assigned_to?: string
  assigned_user?: Profile
  reported_by?: string
  reporter?: Profile
  reported_at?: string
  assigned_at?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface RoomBlock {
  id: string
  room_id: string
  start_date: string
  end_date: string
  block_type: "maintenance" | "admin" | "out_of_order"
  reason?: string
  created_by?: string
  created_at: string
}

export interface HotelSettings {
  id: number
  prepayment_required: boolean
  prepayment_percent: number
  default_checkin_time: string
  default_checkout_time: string
  currency: string
  locale: string
}
