/**
 * Загальні форматтери для всього додатку.
 * Валюта проєкту — гривня (UAH, ₴), локаль — uk-UA.
 */

const uahFmt = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const uahCompactFmt = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
})

const dateFmt = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const dateTimeFmt = new Intl.DateTimeFormat("uk-UA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

/** 1234.5 → "1 234,50 ₴" */
export function formatUAH(amount: number | null | undefined): string {
  const v = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  return uahFmt.format(v)
}

/** 1234.5 → "1 235 ₴" (без копійок — для дашбордів/графіків) */
export function formatUAHCompact(amount: number | null | undefined): string {
  const v = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  return uahCompactFmt.format(v)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return dateFmt.format(d)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return dateTimeFmt.format(d)
}

/** Кількість ночей між check-in і check-out. */
export function nightsBetween(checkIn: string | Date, checkOut: string | Date): number {
  const a = checkIn instanceof Date ? checkIn : new Date(checkIn)
  const b = checkOut instanceof Date ? checkOut : new Date(checkOut)
  const ms = b.getTime() - a.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
