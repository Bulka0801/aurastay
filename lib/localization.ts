import type {
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PaymentStatus,
  ReservationStatus,
  RoomStatus,
  UserRole,
} from "@/lib/types"

export const roleLabels: Record<UserRole, string> = {
  system_admin: "Системний адміністратор",
  general_manager: "Генеральний менеджер",
  front_desk_manager: "Керівник рецепції",
  front_desk_agent: "Адміністратор рецепції",
  reservations_manager: "Менеджер бронювань",
  housekeeping_supervisor: "Супервайзер господарської служби",
  housekeeping_staff: "Працівник господарської служби",
  revenue_manager: "Менеджер з доходів",
  sales_manager: "Менеджер з продажів",
  accountant: "Бухгалтер",
  maintenance_manager: "Керівник технічної служби",
  maintenance_staff: "Працівник технічної служби",
  fb_manager: "Менеджер служби харчування",
}

export const roomStatusLabels: Record<string, string> = {
  available: "Вільний",
  occupied: "Зайнятий",
  dirty: "Потребує прибирання",
  cleaning: "Прибирається",
  inspected: "Перевірено",
  maintenance: "На обслуговуванні",
  blocked: "Не в експлуатації",
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
  credit_card: "Кредитна картка",
  debit_card: "Дебетова картка",
  bank_transfer: "Банківський переказ",
  corporate_billing: "Безготівковий розрахунок",
}

export const maintenanceStatusLabels: Record<string, string> = {
  pending: "Очікується",
  reported: "Зареєстровано",
  in_progress: "У процесі",
  completed: "Виконано",
}

export const maintenancePriorityLabels: Record<string, string> = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
  urgent: "Терміновий",
}

export const housekeepingTaskStatusLabels: Record<string, string> = {
  planned: "Заплановано",
  pending: "Очікує",
  assigned: "Призначено",
  in_progress: "У процесі",
  paused: "На паузі",
  on_hold: "Призупинено",
  completed: "Виконано",
  cancelled: "Скасовано",
}

export const inspectionStatusLabels: Record<string, string> = {
  in_progress: "Триває інспекція",
  passed: "Пройдено",
  failed: "Не пройдено",
}

export const inspectionResultLabels: Record<string, string> = {
  passed: "Прийнято",
  failed: "Відхилено",
  re_clean: "Повторне прибирання",
  maintenance_required: "Потрібен ремонт",
}

export const inspectionCategoryLabels: Record<string, string> = {
  bathroom: "Ванна кімната",
  bedroom: "Спальня",
  amenities: "Засоби та аксесуари",
  electronics: "Техніка",
  overall: "Загальний стан",
}

export const guestStatusLabels: Record<string, string> = {
  occupied: "Зайнятий гостем",
  vacant: "Вільний",
  unknown: "Не визначено",
}

export function formatTaskStatus(status?: string | null) {
  if (!status) return "—"
  return housekeepingTaskStatusLabels[status] ?? status
}

export function formatInspectionStatus(status?: string | null) {
  if (!status) return "—"
  return inspectionStatusLabels[status] ?? status
}

export function formatInspectionResult(result?: string | null) {
  if (!result) return "—"
  return inspectionResultLabels[result] ?? result
}

export function formatInspectionCategory(cat?: string | null) {
  if (!cat) return "—"
  return inspectionCategoryLabels[cat] ?? cat
}

export const housekeepingTaskTypeLabels: Record<string, string> = {
  checkout_cleaning: "Прибирання після виїзду",
  stayover_cleaning: "Поточне прибирання",
  standard_cleaning: "Стандартне прибирання",
  deep_cleaning: "Генеральне прибирання",
  turndown: "Вечірній сервіс (турндаун)",
  inspection: "Перевірка номера",
  linen_change: "Заміна білизни",
  minibar_check: "Перевірка мінібару",
  minibar_restock: "Поповнення мінібару",
  amenity_restock: "Поповнення засобів",
}

export function formatRole(role?: string | null) {
  if (!role) return "—"
  return roleLabels[role as UserRole] ?? role
}

export function formatRoomStatus(status?: string | null) {
  if (!status) return "—"
  return roomStatusLabels[status] ?? status
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
  return housekeepingTaskTypeLabels[taskType] ?? taskType.replace(/_/g, " ")
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
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
