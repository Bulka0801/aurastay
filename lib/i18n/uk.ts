/**
 * Українські підписи для статусів, енамів і загальних фраз.
 * Базові значення БД лишаються англійськими (технічні константи),
 * а у всьому UI використовуються ці мапи.
 */

import type {
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
  no_show: "Не заїхав",
}

export const RESERVATION_STATUS_SHORT_UK: Record<ReservationStatus, string> = {
  pending: "Очікує",
  confirmed: "Підтв.",
  checked_in: "Заселено",
  checked_out: "Виселено",
  cancelled: "Скасов.",
  no_show: "No-show",
}

export const ROOM_STATUS_UK: Record<RoomStatus | "out_of_order" | "inspecting", string> = {
  available: "Вільний",
  occupied: "Зайнятий",
  dirty: "Потребує прибирання",
  cleaning: "Прибирається",
  inspected: "Готовий",
  inspecting: "Перевіряється",
  maintenance: "На ремонті",
  out_of_order: "Несправний",
  blocked: "Заблоковано",
}

export const PAYMENT_STATUS_UK: Record<PaymentStatus | "failed", string> = {
  pending: "Очікує оплати",
  partial: "Часткова",
  paid: "Оплачено",
  refunded: "Повернено",
  failed: "Помилка",
}

export const PAYMENT_METHOD_UK: Record<PaymentMethod | "corporate_account", string> = {
  cash: "Готівка",
  credit_card: "Кредитна картка",
  debit_card: "Дебетова картка",
  bank_transfer: "Банківський переказ",
  corporate_billing: "Корпоративний рахунок",
  corporate_account: "Корпоративний рахунок",
}

export const MAINTENANCE_STATUS_UK: Record<MaintenanceStatus | "assigned", string> = {
  pending: "Нова",
  assigned: "Призначена",
  in_progress: "Виконується",
  completed: "Виконана",
  cancelled: "Скасована",
}

export const MAINTENANCE_PRIORITY_UK: Record<MaintenancePriority, string> = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
  urgent: "Терміново",
}

export const HOUSEKEEPING_STATUS_UK: Record<string, string> = {
  pending: "Заплановано",
  assigned: "Призначено",
  in_progress: "У роботі",
  completed: "Виконано",
  inspected: "Перевірено",
}

export const ROLE_UK: Record<UserRole | "system_administrator", string> = {
  system_admin: "Системний адміністратор",
  system_administrator: "Системний адміністратор",
  general_manager: "Генеральний менеджер",
  front_desk_manager: "Менеджер рецепції",
  front_desk_agent: "Адміністратор рецепції",
  reservations_manager: "Менеджер бронювань",
  housekeeping_supervisor: "Супервайзер господарської служби",
  housekeeping_staff: "Покоївка",
  revenue_manager: "Менеджер доходу",
  sales_manager: "Менеджер продажів",
  accountant: "Бухгалтер",
  maintenance_manager: "Менеджер техслужби",
  maintenance_staff: "Технік",
  fb_manager: "Менеджер ресторану",
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
