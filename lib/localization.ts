import type {
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  RoomStatus,
  RoomHousekeepingStatus,
  RoomOccupancyStatus,
  RoomOperationalStatus,
  UserRole,
} from "@/lib/types"

export const roleLabels: Record<UserRole, string> = {
  system_administrator: "Системний адміністратор",
  general_manager: "Генеральний менеджер",
  front_desk_manager: "Адміністратор рецепції",
  housekeeping_supervisor: "Менеджер господарської служби",
  housekeeping_staff: "Працівник господарської служби",
  maintenance_staff: "Працівник технічної служби",
}

export const roomStatusLabels: Record<string, string> = {
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

export const roomOccupancyStatusLabels: Record<RoomOccupancyStatus, string> = {
  vacant: "Вільний",
  occupied: "Зайнятий",
}

export const roomHousekeepingStatusLabels: Record<RoomHousekeepingStatus, string> = {
  clean: "Чистий",
  dirty: "Потребує прибирання",
  cleaning: "Прибирається",
  inspecting: "На перевірці",
  inspected: "Перевірено",
}

export const roomOperationalStatusLabels: Record<RoomOperationalStatus, string> = {
  operational: "Справний",
  maintenance: "На техобслуговуванні",
  out_of_order: "Не в експлуатації",
  blocked: "Тимчасово недоступний",
}

export const reservationStatusLabels: Record<string, string> = {
  pending: "Очікується",
  confirmed: "Підтверджено",
  checked_in: "Заселено",
  checked_out: "Виселено",
  cancelled: "Скасовано",
  no_show: "Не прибув",
}

export const paymentStatusLabels: Record<string, string> = {
  pending: "Очікується",
  partial: "Частково оплачено",
  paid: "Оплачено",
  refunded: "Повернено", //коли скасування
}

export const paymentMethodLabels: Record<string, string> = {
  cash: "Готівка",
  card_terminal: "Карткою (через термінал)",
  bank_transfer_iban: "За реквізитами (IBAN)",
}

export const maintenanceStatusLabels: Record<string, string> = {
  pending: "Очікується",
  assigned: "Зареєстровано",
  in_progress: "У процесі",
  completed: "Виконано",
  cancelled: "Скасовано",
}

export const maintenancePriorityLabels: Record<string, string> = {
  low: "Низький",
  normal: "Середній",
  high: "Високий",
  urgent: "Терміновий",
}

export const housekeepingTaskTypeLabels: Record<string, string> = {
  standard_cleaning: "Стандартне прибирання",
  checkout_cleaning: "Прибирання після виселення",
  stayover_cleaning: "Прибирання під час проживання",
  deep_cleaning: "Генеральне прибирання",
  turndown: "Вечірнє обслуговування",
  inspection: "Перевірка",
  linen_change: "Заміна білизни",
  minibar_check: "Перевірка мінібару",
  minibar_restock: "Поповнення мінібару",
  amenity_restock: "Поповнення засобів гігієни",
}

export function formatRole(role?: string | null) {
  if (!role) return "—"
  return roleLabels[role as UserRole] ?? role
}

export function formatRoomStatus(status?: string | null) {
  if (!status) return "—"
  return roomStatusLabels[status] ?? status
}

export function formatRoomOccupancyStatus(status?: string | null) {
  if (!status) return "—"
  return roomOccupancyStatusLabels[status as RoomOccupancyStatus] ?? status
}

export function formatRoomHousekeepingStatus(status?: string | null) {
  if (!status) return "—"
  return roomHousekeepingStatusLabels[status as RoomHousekeepingStatus] ?? status
}

export function formatRoomOperationalStatus(status?: string | null) {
  if (!status) return "—"
  return roomOperationalStatusLabels[status as RoomOperationalStatus] ?? status
}

export function formatReservationStatus(status?: string | null) {
  if (!status) return "—"
  return reservationStatusLabels[status] ?? status
}

export function formatPaymentStatus(status?: string | null) {
  if (!status) return "—"
  return paymentStatusLabels[status] ?? status
}

export function formatPaymentMethod(method?: string | null) {
  if (!method) return "—"
  return paymentMethodLabels[method] ?? method
}

export function formatMaintenanceStatus(status?: string | null) {
  if (!status) return "—"
  return maintenanceStatusLabels[status] ?? status
}

export function formatPriority(priority?: string | null) {
  if (!priority) return "—"
  return maintenancePriorityLabels[priority] ?? priority
}

export function formatTaskType(taskType?: string | null) {
  if (!taskType) return "—"
  return housekeepingTaskTypeLabels[taskType] ?? taskType
}

export function pluralGuests(adults: number, children = 0) {
  const adultLabel = adults === 1 ? "дорослий" : adults >= 2 && adults <= 4 ? "дорослих" : "дорослих"
  const childLabel = children === 1 ? "дитина" : children >= 2 && children <= 4 ? "дитини" : "дітей"
  return children > 0 ? `${adults} ${adultLabel}, ${children} ${childLabel}` : `${adults} ${adultLabel}`
}

export function formatDate(date?: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("uk-UA")
}

export function formatDateTime(date?: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleString("uk-UA")
}

export function formatCurrency(amount?: number | string | null) {
  const value = Number(amount ?? 0)

  if (!Number.isFinite(value)) {
    return "0,00 грн"
  }

  const sign = value < 0 ? "-" : ""
  const [integerPart, fractionPart] = Math.abs(value).toFixed(2).split(".")
  const groupedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ")

  return `${sign}${groupedIntegerPart},${fractionPart} грн`
}
