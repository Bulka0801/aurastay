/**
 * State machine для бронювань, номерів і задач покоївок.
 * Використовується у UI для показу/приховування кнопок і валідації
 * перед викликом Supabase. Сервер (RLS + тригери) залишається
 * source of truth; клієнтська перевірка лише для UX.
 */

import type { HousekeepingTaskStatus, ReservationStatus, RoomStatus } from "@/lib/types"

/* ------------------------------------------------------------------ */
/* БРОНЮВАННЯ                                                          */
/* ------------------------------------------------------------------ */

export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending:     ["confirmed", "cancelled"],          // після передплати → confirmed
  confirmed:   ["checked_in", "cancelled", "no_show"],
  checked_in:  ["checked_out"],
  checked_out: [],                                  // термінальний
  cancelled:   [],                                  // термінальний
  no_show:     [],                                  // термінальний
}

export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  return RESERVATION_TRANSITIONS[from]?.includes(to) ?? false
}

/** Чи це термінальний статус, який більше не можна змінити. */
export function isTerminalReservation(status: ReservationStatus): boolean {
  return RESERVATION_TRANSITIONS[status]?.length === 0
}

/** Чи можна редагувати дати/кількість гостей/побажання. */
export function canEditReservation(status: ReservationStatus): boolean {
  return status === "pending" || status === "confirmed"
}

/** Чи можна скасувати бронювання. */
export function canCancelReservation(status: ReservationStatus): boolean {
  return status === "pending" || status === "confirmed"
}

/* ------------------------------------------------------------------ */
/* НОМЕР                                                               */
/* ------------------------------------------------------------------ */

export const ROOM_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  available:    ["occupied", "dirty", "maintenance", "out_of_order", "blocked"],
  occupied:     ["dirty"], // тільки після виїзду
  dirty:        ["cleaning", "maintenance", "out_of_order"],
  cleaning:     ["inspecting", "dirty"],
  inspecting:   ["available", "dirty"],
  maintenance:  ["available", "out_of_order"],
  out_of_order: ["maintenance", "available"],
  blocked:      ["available"],
}

export function canTransitionRoom(from: RoomStatus, to: RoomStatus): boolean {
  return ROOM_TRANSITIONS[from]?.includes(to) ?? false
}

/** У який статус очікувано перевести номер після події бронювання. */
export function roomStatusAfterCheckIn(): RoomStatus {
  return "occupied"
}
export function roomStatusAfterCheckOut(): RoomStatus {
  return "dirty"
}

/** Чи готовий номер прийняти гостя (check-in). */
export function isRoomReadyForCheckIn(status: RoomStatus): boolean {
  return status === "available" || status === "inspecting"
}

/* ------------------------------------------------------------------ */
/* ЗАВДАННЯ ПОКОЇВОК                                                    */
/* ------------------------------------------------------------------ */

export const HK_TRANSITIONS: Record<HousekeepingTaskStatus, HousekeepingTaskStatus[]> = {
  pending:     ["assigned", "in_progress"],
  assigned:    ["in_progress", "pending"],
  in_progress: ["completed"],
  completed:   ["inspected"],
  inspected:   [],
}

export function canTransitionHk(from: HousekeepingTaskStatus, to: HousekeepingTaskStatus): boolean {
  return HK_TRANSITIONS[from]?.includes(to) ?? false
}
