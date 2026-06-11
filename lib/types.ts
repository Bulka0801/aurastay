export type UserRole =
  | "system_administrator"
  | "general_manager"
  | "front_desk_manager"
  | "housekeeping_supervisor"
  | "housekeeping_staff"
  | "maintenance_staff"

export type RoomStatus =
  | "available"
  | "occupied"
  | "dirty"
  | "cleaning"
  | "inspecting"
  | "inspected"
  | "maintenance"
  | "out_of_order"
  | "blocked"

export type RoomOccupancyStatus = "vacant" | "occupied"

export type RoomHousekeepingStatus =
  | "clean"
  | "dirty"
  | "cleaning"
  | "inspecting"
  | "inspected"

export type RoomOperationalStatus =
  | "operational"
  | "maintenance"
  | "out_of_order"
  | "blocked"

export type ReservationStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show"

export type PaymentStatus = "pending" | "partial" | "paid" | "refunded" | "failed"

export type PaymentMethod = "cash" | "card_terminal" | "bank_transfer_iban"

export type PaymentTransactionType = "payment" | "refund"
export type IncomingPaymentStatus = "pending" | "paid" | "failed"
export type RefundStatus = "pending" | "refunded" | "failed"
export type FolioFinancialState =
  | "awaiting_payment"
  | "partially_paid"
  | "balanced"
  | "overpaid"
  | "awaiting_refund"
  | "pending_transaction"
export type FolioChargeStatus = "confirmed" | "voided"
export type FolioChargeCategory = "accommodation" | "no_show_fee" | "cancellation_fee" | "adjustment"

export type HousekeepingTaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "inspected"

export type MaintenanceStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled"

export const ACTIVE_HOUSEKEEPING_STATUSES = ["pending", "assigned", "in_progress", "completed"] as const
export const ARCHIVED_HOUSEKEEPING_STATUSES = ["inspected"] as const

export const ACTIVE_MAINTENANCE_STATUSES = ["pending", "assigned", "in_progress"] as const
export const ARCHIVED_MAINTENANCE_STATUSES = ["completed", "cancelled"] as const

export type MaintenancePriority = "low" | "normal" | "high" | "urgent"

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
  occupancy_status?: RoomOccupancyStatus
  housekeeping_status?: RoomHousekeepingStatus
  operational_status?: RoomOperationalStatus
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
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
}

export interface ReservationRoom {
  id: string
  reservation_id: string | null
  reservation?: Reservation
  room_id: string | null
  room?: Room
  room_type_id: string | null
  room_type?: RoomType
  rate: number
  check_in_time: string | null
  check_out_time: string | null
  actual_check_in: string | null
  actual_check_out: string | null
  created_at: string | null
  updated_at: string | null
  start_date: string | null
  end_date: string | null
  moved_from_room_id: string | null
  moved_from_room?: Room
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
  financial_state?: FolioFinancialState
  total_charges?: number
  total_payments?: number
  total_refunds?: number
  pending_payment_amount?: number
  pending_refund_amount?: number
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
  category: FolioChargeCategory
  charge_status: FolioChargeStatus
  voided_at?: string
  voided_by?: string
  void_reason?: string
  created_by?: string
  created_at: string
}

export interface Payment {
  id: string
  reservation_id: string
  folio_id: string
  amount: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  transaction_type: PaymentTransactionType
  parent_payment_id?: string
  payment_date: string
  transaction_id?: string
  card_last_four?: string
  notes?: string
  processed_by?: string
  status_changed_at?: string
  status_changed_by?: string
  failure_reason?: string
  refund_method_override_reason?: string
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
