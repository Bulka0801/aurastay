/**
 * Українські підписи для статусів, енамів і загальних фраз.
 * Базові значення БД лишаються англійськими (технічні константи),
 * а у всьому UI використовуються ці мапи.
 */

import type {
  HousekeepingTaskStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  RoomStatus,
  UserRole,
} from "@/lib/types"

export const RESERVATION_STATUS_UK: Record<ReservationStatus, string> = {
  pending: "Очікує передплату",
  confirmed: "Підтверджено",
  checked_in: "Заселено",
  checked_out: "Виселено",
  cancelled: "Скасовано",
  no_show: "Не прибув",
}

export const RESERVATION_STATUS_SHORT_UK: Record<ReservationStatus, string> = {
  pending: "Очікує",
  confirmed: "Підтв.",
  checked_in: "Заселено",
  checked_out: "Виселено",
  cancelled: "Скасов.",
  no_show: "No-show",
}

export const ROOM_STATUS_UK: Record<RoomStatus, string> = {
  available: "Вільний",
  occupied: "Зайнятий",
  dirty: "Потребує прибирання",
  cleaning: "Прибирається",
  inspecting: "На перевірці",
  inspected: "Перевірено",
  maintenance: "На техобслуговуванні",
  blocked: "Тимчасово недоступний",
  out_of_order: "Не в експлуатації",
}

export const PAYMENT_STATUS_UK: Record<PaymentStatus , string> = {
  pending: "Очікується",
  partial: "Частково оплачено",
  paid: "Оплачено",
  refunded: "Повернено",
  failed: "Неуспішно",
}

export const PAYMENT_METHOD_UK = {
  cash: "Готівка",
  card_terminal: "Карткою (через термінал)",
  bank_transfer_iban: "За реквізитами (IBAN)",
}

export const MAINTENANCE_STATUS_UK: Record<MaintenanceStatus , string> = {
  pending: "Очікується",
  assigned: "Зареєстровано",
  in_progress: "Виконується",
  completed: "Виконана",
  cancelled: "Скасована",
}

export const MAINTENANCE_PRIORITY_UK: Record<MaintenancePriority, string> = {
  low: "Низький",
  normal: "Середній",
  high: "Високий",
  urgent: "Терміновий",
}

export const HOUSEKEEPING_STATUS_UK: Record<HousekeepingTaskStatus, string> = {
  pending: "Заплановано",
  assigned: "Призначено",
  in_progress: "У роботі",
  completed: "На перевірці",
  inspected: "Перевірено",
}

export const ROLE_UK: Record<UserRole, string> = {
  system_administrator: "Системний адміністратор", //+
  general_manager: "Генеральний менеджер", //+
  front_desk_manager: "Адміністратор рецепції", //+
  housekeeping_supervisor: "Менеджер господарської служби", //+
  housekeeping_staff: "Працівник господарської служби", //+
  maintenance_staff: "Працівник технічної служби",//+
}

export const VIEW_MODE_UK = {
  day: "День",
  week: "Тиждень",
  month: "Місяць",
} as const

export const MONTHS_UK = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
]

export const MONTHS_GEN_UK = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
]

export const WEEKDAYS_SHORT_UK = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
export const WEEKDAYS_UK = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "Пʼятниця", "Субота"]

/** Склоніння на кшталт "2 ночі", "5 ночей" */
export function pluralizeNights(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ніч`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ночі`
  return `${n} ночей`
}

export function pluralizeGuests(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} гість`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} гостя`
  return `${n} гостей`
}
