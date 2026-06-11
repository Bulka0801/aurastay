import type { LucideIcon } from "lucide-react"
import {
  Activity,
  ArrowRightLeft,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react"

export type AuditLogEntry = {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  changes: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string | null
}

export type AuditLogUser = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  employee_id: string | null
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  folio_closed: "Закрито рахунок гостя",
  folio_closed_after_checkout: "Закрито рахунок гостя після виїзду",
  folio_reopened: "Повторно відкрито рахунок гостя",

  reservation_dates_changed: "Змінено дати бронювання",
  reservation_auto_confirmed: "Автоматично підтверджено бронювання",
  reservation_auto_confirmed_after_payment: "Автоматично підтверджено після оплати",
  reservation_cancelled: "Скасовано бронювання",
  reservation_no_show: "No-show бронювання",
  reservation_marked_no_show: "Бронювання відмічено як No-show",
  reservation_finances_resolved: "Вирішено фінансові питання бронювання",

  payment_created: "Створено платіж",
  payment_refunded: "Повернено платіж",
  payment_status_changed: "Змінено статус платежу",
  iban_payment_confirmed: "Підтверджено платіж за реквізитами",
  iban_payment_failed: "Неуспішно проведено платіж за реквізитами",
  refund_created: "Створено повернення",
  refund_completed: "Завершено повернення",

  INSERT: "Створено запис",
  UPDATE: "Оновлено запис",
  DELETE: "Видалено запис",
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  reservation: "Бронювання",
  reservations: "Бронювання",
  reservation_room: "Номер у бронюванні",
  reservation_rooms: "Номери у бронюванні",

  payment: "Платіж",
  payments: "Платежі",

  folio: "Фоліо",
  folios: "Фоліо",

  room: "Номер",
  rooms: "Номери",
  room_blocks: "Блокування номера",
  room_type: "Тип номера",
  room_types: "Типи номерів",

  guest: "Гість",
  guests: "Гості",

  user: "Користувач",
  users: "Користувачі",

  hotel_settings: "Налаштування готелю",
}

export function formatAuditAction(action?: string | null) {
  if (!action) return "Подія"
  return AUDIT_ACTION_LABELS[action] ?? action.replaceAll("_", " ")
}

export function formatAuditEntity(entityType?: string | null) {
  if (!entityType) return "Система"
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType.replaceAll("_", " ")
}

export function formatAuditRole(role?: string | null) {
  if (!role) return "Роль не вказана"

  const labels: Record<string, string> = {
    system_administrator: "Системний адміністратор",
    hotel_manager: "Менеджер готелю",
    front_desk: "Рецепція",
    front_desk_agent: "Адміністратор рецепції",
    housekeeper: "Покоївка",
    housekeeping: "Господарська служба",
    maintenance: "Технічна служба",
  }

  return labels[role] ?? role.replaceAll("_", " ")
}

export function formatAuditUserName(user?: AuditLogUser | null) {
  if (!user) return "Система"

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return fullName || user.email || "Користувач"
}

export function getAuditActionIcon(action?: string | null): LucideIcon {
  if (!action) return Activity

  const value = action.toLowerCase()

  if (value === "insert") return Plus
  if (value === "update") return Pencil
  if (value === "delete") return Trash2

  if (value.includes("cancel") || value.includes("no_show") || value.includes("failed")) {
    return ShieldAlert
  }

  if (value.includes("date")) return ArrowRightLeft
  if (value.includes("confirm")) return BadgeCheck
  if (value.includes("folio") || value.includes("payment") || value.includes("refund")) return CircleDollarSign
  if (value.includes("reservation")) return CalendarDays

  return FileText
}

export function getAuditActionBadgeVariant(
  action?: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (!action) return "outline"

  const value = action.toLowerCase()

  if (value.includes("failed") || value.includes("cancel") || value.includes("no_show") || value === "delete") {
    return "destructive"
  }

  if (value.includes("confirm") || value.includes("closed") || value.includes("completed")) {
    return "default"
  }

  if (value === "insert" || value === "update" || value.includes("refund")) {
    return "secondary"
  }

  return "outline"
}

export function shortenId(value?: string | null) {
  if (!value) return "—"
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function formatAuditField(field: string) {
  const labels: Record<string, string> = {
    id: "ID",
    status: "Статус",
    reason: "Причина",
    amount: "Сума",
    total_amount: "Загальна сума",
    paid_amount: "Сплачено",
    payment_status: "Статус оплати",
    reservation_id: "ID бронювання",
    parent_payment_id: "Батьківський платіж",
    room_id: "ID номера",
    start_date: "Дата початку",
    end_date: "Дата завершення",
    check_in: "Дата заїзду",
    check_out: "Дата виїзду",
    old_check_in: "Попередній заїзд",
    new_check_in: "Новий заїзд",
    old_check_out: "Попередній виїзд",
    new_check_out: "Новий виїзд",
    block_type: "Тип блокування",
    created_by: "Створив",
    created_at: "Створено",
    updated_at: "Оновлено",
    prepayment_percent: "Відсоток передплати",
    prepayment_required: "Передплата обов’язкова",
    default_checkin_time: "Час заїзду",
    default_checkout_time: "Час виїзду",
  }

  return labels[field] ?? field.replaceAll("_", " ")
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "так" : "ні"

  if (typeof value === "number") {
    return new Intl.NumberFormat("uk-UA").format(value)
  }

  if (typeof value === "string") {
    return value
  }

  return JSON.stringify(value)
}

function formatMoney(value: unknown) {
  if (typeof value !== "number") return formatAuditValue(value)

  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
  }).format(value)
}

export function getAuditChangeSummary(changes?: Record<string, unknown> | null) {
  if (!changes) return "Деталі не передані"

  const oldValue = changes.old
  const newValue = changes.new

  if (isRecord(oldValue) && isRecord(newValue)) {
    const keys = Array.from(new Set([...Object.keys(oldValue), ...Object.keys(newValue)]))

    const changedFields = keys.filter((key) => {
      return JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])
    })

    if (changedFields.length === 0) return "Значення не змінилися"

    const visibleFields = changedFields.slice(0, 4).map(formatAuditField).join(", ")
    const suffix = changedFields.length > 4 ? ` +${changedFields.length - 4}` : ""

    return `Змінено: ${visibleFields}${suffix}`
  }

  if (isRecord(newValue)) {
    const fields = Object.keys(newValue).slice(0, 4).map(formatAuditField).join(", ")
    return fields ? `Створено запис. Поля: ${fields}` : "Створено запис"
  }

  if (isRecord(oldValue)) {
    const fields = Object.keys(oldValue).slice(0, 4).map(formatAuditField).join(", ")
    return fields ? `Видалено запис. Поля: ${fields}` : "Видалено запис"
  }

  const parts: string[] = []

  if ("amount" in changes) {
    parts.push(`Сума: ${formatMoney(changes.amount)}`)
  }

  if ("required_amount" in changes) {
    parts.push(`Потрібно: ${formatMoney(changes.required_amount)}`)
  }

  if ("net_paid" in changes) {
    parts.push(`Сплачено: ${formatMoney(changes.net_paid)}`)
  }

  if ("reservation_id" in changes) {
    parts.push(`Бронювання: ${shortenId(String(changes.reservation_id))}`)
  }

  if ("parent_payment_id" in changes) {
    parts.push(`Пов’язаний платіж: ${shortenId(String(changes.parent_payment_id))}`)
  }

  if ("reason" in changes) {
    parts.push(`Причина: ${formatAuditValue(changes.reason)}`)
  }

  if ("old_check_in" in changes || "new_check_in" in changes || "old_check_out" in changes || "new_check_out" in changes) {
    parts.push("Змінено період проживання")
  }

  return parts.length > 0 ? parts.join("; ") : "Дані події збережено"
}