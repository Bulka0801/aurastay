import { MONTHS_GEN_UK, MONTHS_UK, WEEKDAYS_SHORT_UK } from "@/lib/i18n/uk"
import type { RackDay, ViewMode } from "./types"

/** Повертає ISO (yyyy-mm-dd) без впливу часової зони. */
export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function addDays(d: Date, n: number): Date {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + n)
  return nd
}

export function startOfDay(d: Date): Date {
  const nd = new Date(d)
  nd.setHours(0, 0, 0, 0)
  return nd
}

export function startOfWeek(d: Date): Date {
  // тиждень з понеділка
  const nd = startOfDay(d)
  const weekday = nd.getDay() // 0..6, 0=Нд
  const delta = weekday === 0 ? -6 : 1 - weekday
  nd.setDate(nd.getDate() + delta)
  return nd
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function diffInDays(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

/** Повертає діапазон [start, end) для заданого виду */
export function getRangeForView(anchor: Date, mode: ViewMode): { start: Date; end: Date; days: number } {
  const a = startOfDay(anchor)
  if (mode === "day") {
    // показуємо 3 дні: вчора-сьогодні-завтра — але "день" як вид трактуємо як 1 день
    // Насправді для операційного перегляду зручний 14-денний горизонт,
    // тому "День" = 1 день деталі (погодинно). Щоб не ускладнювати MVP —
    // у режимі "День" показуємо 3 дні з сьогодні в центрі.
    return { start: addDays(a, -1), end: addDays(a, 2), days: 3 }
  }
  if (mode === "week") {
    const start = startOfWeek(a)
    return { start, end: addDays(start, 7), days: 7 }
  }
  // month
  const start = startOfMonth(a)
  const end = addDays(endOfMonth(a), 1)
  return { start, end, days: diffInDays(start, end) }
}

export function enumerateDays(start: Date, end: Date, today = startOfDay(new Date())): RackDay[] {
  const result: RackDay[] = []
  const n = diffInDays(start, end)
  for (let i = 0; i < n; i++) {
    const d = addDays(start, i)
    const weekday = d.getDay()
    result.push({
      iso: toISO(d),
      date: d,
      isToday: isSameDay(d, today),
      isWeekend: weekday === 0 || weekday === 6,
      isMonthStart: d.getDate() === 1,
    })
  }
  return result
}

/** Скільки ночей між check_in і check_out (ексклюзивно для check_out) */
export function nightsBetween(checkInISO: string, checkOutISO: string): number {
  return Math.max(1, diffInDays(parseISO(checkInISO), parseISO(checkOutISO)))
}

export function formatDayShort(d: Date): string {
  return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`
}

export function formatWeekday(d: Date): string {
  return WEEKDAYS_SHORT_UK[d.getDay()]
}

export function formatFullDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_GEN_UK[d.getMonth()]} ${d.getFullYear()}`
}

export function formatMonthTitle(d: Date): string {
  return `${MONTHS_UK[d.getMonth()]} ${d.getFullYear()}`
}

export function formatRangeTitle(start: Date, end: Date): string {
  const lastDay = addDays(end, -1)
  if (start.getMonth() === lastDay.getMonth() && start.getFullYear() === lastDay.getFullYear()) {
    return `${start.getDate()}–${lastDay.getDate()} ${MONTHS_GEN_UK[start.getMonth()]} ${start.getFullYear()}`
  }
  return `${formatFullDate(start)} – ${formatFullDate(lastDay)}`
}

/** Чи переселення з однієї дати на іншу не виходить за мінімум 1 ніч */
export function clampCheckout(checkInISO: string, checkOutISO: string): string {
  const ci = parseISO(checkInISO)
  const co = parseISO(checkOutISO)
  if (diffInDays(ci, co) < 1) return toISO(addDays(ci, 1))
  return checkOutISO
}

export function clampCheckin(checkInISO: string, checkOutISO: string): string {
  const ci = parseISO(checkInISO)
  const co = parseISO(checkOutISO)
  if (diffInDays(ci, co) < 1) return toISO(addDays(co, -1))
  return checkInISO
}
