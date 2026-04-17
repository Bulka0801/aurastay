/**
 * Типи для модуля шахматки (room-rack).
 * Представлення даних орієнтоване на рендер: плаский масив номерів
 * і плаский масив блоків бронювань з уже розрахованими датами.
 */

import type { ReservationStatus, RoomStatus } from "@/lib/types"

export type ViewMode = "day" | "week" | "month"

export interface RackRoom {
  id: string
  room_number: string
  floor: number
  status: RoomStatus | "out_of_order" | "inspecting"
  room_type_id: string
  room_type_name: string
  room_type_code?: string
  base_rate?: number
  max_occupancy?: number
  notes?: string | null
}

export interface RackGuest {
  id: string
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  is_vip?: boolean
}

/**
 * Один блок у шахматці — один рядок `reservation_rooms`.
 * Дати успадковуються від `reservations.check_in_date / check_out_date`.
 */
export interface RackBlock {
  /** id з таблиці reservation_rooms — саме його рухаємо */
  reservation_room_id: string
  reservation_id: string
  reservation_number: string
  room_id: string | null
  guest: RackGuest
  check_in: string // ISO yyyy-mm-dd
  check_out: string // ISO yyyy-mm-dd
  nights: number
  status: ReservationStatus
  payment_status: "pending" | "partial" | "paid" | "refunded" | "failed"
  total_amount: number
  paid_amount: number
  balance: number
  adults: number
  children: number
  rate?: number
  special_requests?: string | null
}

export interface RackDay {
  iso: string
  date: Date
  isToday: boolean
  isWeekend: boolean
  /** перший день місяця — для акцентів у monthly view */
  isMonthStart: boolean
}

export interface RackKpi {
  totalRooms: number
  occupiedRooms: number
  freeRooms: number
  occupancyRate: number
  arrivalsToday: number
  departuresToday: number
  inHouse: number
  pendingConfirm: number
}

export interface PendingChange {
  type: "move" | "resize-start" | "resize-end"
  block: RackBlock
  targetRoomId?: string
  newCheckIn?: string
  newCheckOut?: string
  conflicts: RackBlock[]
}
