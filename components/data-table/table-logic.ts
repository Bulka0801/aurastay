import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
} from "@tanstack/react-table"

import { normalizeFilterValue } from "@/components/data-table/filter-utils"
import type {
  DateRangeFilterValue,
  NumberFilterValue,
  TextFilterValue,
} from "@/components/data-table/types"

export function toDateInputValue(date: Date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "Europe/Kiev",
  })
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

export function getDatePresetRange(preset: string) {
  const today = new Date()
  const todayValue = toDateInputValue(today)
  const yesterdayValue = toDateInputValue(addDays(today, -1))
  const tomorrowValue = toDateInputValue(addDays(today, 1))

  if (preset === "today" || preset === "todayDepartures") {
    return { from: todayValue, to: todayValue }
  }

  if (preset === "yesterday") {
    return { from: yesterdayValue, to: yesterdayValue }
  }

  if (preset === "tomorrowDepartures") {
    return { from: tomorrowValue, to: tomorrowValue }
  }

  if (preset === "thisWeek") {
    const startOfWeek = new Date(today)
    const day = startOfWeek.getDay() || 7
    startOfWeek.setDate(startOfWeek.getDate() - day + 1)
    const endOfWeek = addDays(startOfWeek, 6)

    return {
      from: toDateInputValue(startOfWeek),
      to: toDateInputValue(endOfWeek),
    }
  }

  if (preset === "thisMonth") {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    return {
      from: toDateInputValue(startOfMonth),
      to: toDateInputValue(endOfMonth),
    }
  }

  if (preset === "pastDates" || preset === "overdueDepartures") {
    return { to: yesterdayValue }
  }

  if (preset === "futureDates") {
    return { from: tomorrowValue }
  }

  return {}
}

export function getReservationStayLength(rowOriginal: unknown) {
  const reservation = rowOriginal as {
    check_in_date?: string | null
    check_out_date?: string | null
  }

  if (!reservation.check_in_date || !reservation.check_out_date) {
    return 0
  }

  const checkInTime = new Date(reservation.check_in_date).getTime()
  const checkOutTime = new Date(reservation.check_out_date).getTime()

  if (Number.isNaN(checkInTime) || Number.isNaN(checkOutTime)) {
    return 0
  }

  return Math.round((checkOutTime - checkInTime) / 86_400_000)
}

function parseDateParts(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return {
    month: date.getMonth(),
    day: date.getDate(),
  }
}

function getBirthdayOrdinal(dateParts: { month: number; day: number }) {
  const ordinal = Math.floor(Date.UTC(2000, dateParts.month, dateParts.day) / 86_400_000)

  return Number.isNaN(ordinal) ? null : ordinal
}

function getBirthdayPresetRange(preset: string) {
  const today = parseDateParts(toDateInputValue(new Date()))

  if (!today) {
    return null
  }

  if (preset === "today") {
    const ordinal = getBirthdayOrdinal(today)
    return ordinal === null ? null : { from: ordinal, to: ordinal }
  }

  if (preset === "thisMonth") {
    const from = getBirthdayOrdinal({ month: today.month, day: 1 })
    const daysInMonth = new Date(2000, today.month + 1, 0).getDate()
    const to = getBirthdayOrdinal({ month: today.month, day: daysInMonth })

    if (from === null || to === null) {
      return null
    }

    return { from, to }
  }

  return null
}

function parseBirthdayRangeValue(value: string) {
  const [from, to] = value.split("..")
  const fromParts = parseDateParts(from)
  const toParts = parseDateParts(to)

  return {
    from: fromParts ? getBirthdayOrdinal(fromParts) : null,
    to: toParts ? getBirthdayOrdinal(toParts) : null,
  }
}

export const checkboxFilter = (row: any, columnId: string, filterValue: unknown) => {
  if (Array.isArray(filterValue) && filterValue.length === 0) {
    return false
  }

  const selectedValues = Array.isArray(filterValue)
    ? filterValue.map(String)
    : typeof filterValue === "string"
      ? filterValue.split(",").filter(Boolean)
      : []

  if (selectedValues.length === 0) {
    return true
  }

  return selectedValues.includes(normalizeFilterValue(row.getValue(columnId)))
}

export const textFilter = (row: any, columnId: string, filterValue: unknown) => {
  const filter =
    typeof filterValue === "object" && filterValue !== null
      ? (filterValue as TextFilterValue)
      : { operator: "contains", value: String(filterValue ?? "") }
  const query = String(filter.value ?? "").trim().toLocaleLowerCase("uk")

  if (!query) {
    return true
  }

  const value = String(row.getValue(columnId) ?? "")
    .toLocaleLowerCase("uk")

  if (filter.operator === "startsWith") {
    return value.startsWith(query)
  }

  if (filter.operator === "equals") {
    return value === query
  }

  return value.includes(query)
}

export const numberFilter = (row: any, columnId: string, filterValue: unknown) => {
  const filter = filterValue as NumberFilterValue | undefined
  const value = Number(row.getValue(columnId))

  if (!filter || Number.isNaN(value)) {
    return true
  }

  const mainValue = Number(filter.value)
  const minValue = Number(filter.min)
  const maxValue = Number(filter.max)

  if (filter.operator === "between") {
    if (filter.min && value < minValue) {
      return false
    }

    if (filter.max && value > maxValue) {
      return false
    }

    return Boolean(filter.min || filter.max)
  }

  if (!filter.value) {
    return true
  }

  if (filter.operator === "equals") {
    return value === mainValue
  }

  if (filter.operator === "greaterThan") {
    return value > mainValue
  }

  if (filter.operator === "lessThan") {
    return value < mainValue
  }

  return true
}

export const dateRangeFilter = (row: any, columnId: string, filterValue: unknown) => {
  const range = filterValue as DateRangeFilterValue | undefined

  if (!range?.preset && !range?.from && !range?.to) {
    return true
  }

  const rowValue = row.getValue(columnId)

  if (!rowValue) {
    return false
  }

  if (columnId === "date_of_birth") {
    const rowDateParts = parseDateParts(rowValue)

    if (!rowDateParts) {
      return false
    }

    const rowOrdinal = getBirthdayOrdinal(rowDateParts)

    if (rowOrdinal === null) {
      return false
    }

    const presetRange = range.preset ? getBirthdayPresetRange(range.preset) : null
    const explicitRange =
      range.from || range.to
        ? parseBirthdayRangeValue(`${range.from ?? ""}..${range.to ?? ""}`)
        : null

    const from = explicitRange?.from ?? presetRange?.from
    const to = explicitRange?.to ?? presetRange?.to

    if (from === null || from === undefined) {
      if (to === null || to === undefined) {
        return true
      }

      return rowOrdinal <= to
    }

    if (to === null || to === undefined) {
      return rowOrdinal >= from
    }

    if (from <= to) {
      return rowOrdinal >= from && rowOrdinal <= to
    }

    return rowOrdinal >= from || rowOrdinal <= to
  }

  if (range.preset === "overdueDepartures") {
    const reservation = row.original as { status?: string | null }

    if (reservation.status !== "checked_in") {
      return false
    }
  }

  if (range.preset === "longStays") {
    return getReservationStayLength(row.original) > 7
  }

  const presetRange = range.preset ? getDatePresetRange(range.preset) : {}
  const from = range.from ?? presetRange.from
  const to = range.to ?? presetRange.to

  const rowTime = new Date(String(rowValue)).getTime()

  if (Number.isNaN(rowTime)) {
    return false
  }

  if (from) {
    const fromTime = new Date(`${from}T00:00:00`).getTime()

    if (rowTime < fromTime) {
      return false
    }
  }

  if (to) {
    const toTime = new Date(`${to}T23:59:59`).getTime()

    if (rowTime > toTime) {
      return false
    }
  }

  return true
}

export const globalTextFilter = (row: any, columnId: string, filterValue: unknown) => {
  const query = String(filterValue ?? "").trim().toLocaleLowerCase("uk")

  if (!query) {
    return true
  }

  return String(row.getValue(columnId) ?? "")
    .toLocaleLowerCase("uk")
    .includes(query)
}

export function getColumnFilterFn<TData, TValue>(column: ColumnDef<TData, TValue>) {
  if (column.filterFn) {
    return column.filterFn
  }

  if (column.meta?.filterType === "checkbox") {
    return checkboxFilter
  }

  if (column.meta?.filterType === "search") {
    return textFilter
  }

  if (column.meta?.filterType === "number") {
    return numberFilter
  }

  if (column.meta?.filterType === "dateRange") {
    return dateRangeFilter
  }

  return undefined
}

export function applySmartColumnDefaults<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): ColumnDef<TData, TValue>[] {
  return columns.map((column) => {
    const columnWithDefaults = {
      ...column,
      enableSorting: column.meta?.sortable === true,
      enableColumnFilter: column.meta?.filterable === true,
      enableGlobalFilter: column.meta?.searchable === true,
      filterFn: getColumnFilterFn(column),
    } as ColumnDef<TData, TValue> & { columns?: ColumnDef<TData, TValue>[] }

    if ("columns" in column && column.columns) {
      columnWithDefaults.columns = applySmartColumnDefaults(column.columns)
    }

    return columnWithDefaults
  })
}

export function buildTableFeatureFns() {
  return {
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  }
}
