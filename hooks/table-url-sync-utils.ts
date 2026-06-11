import type { ColumnDef, ColumnFiltersState, SortingState, Updater } from "@tanstack/react-table"

import type { DateRangeFilterValue, DataTableColumnMeta } from "@/components/data-table/types"

const FILTER_PREFIX = "filter_"
const JSON_VALUE_PREFIX = "json:"

function getColumnId<TData, TValue>(column: ColumnDef<TData, TValue>) {
  if ("id" in column && column.id) {
    return column.id
  }

  if ("accessorKey" in column && typeof column.accessorKey === "string") {
    return column.accessorKey
  }

  return undefined
}

export function flattenColumnMeta<TData, TValue>(
  columns: ColumnDef<TData, TValue>[],
  metaByColumnId = new Map<string, Partial<DataTableColumnMeta>>()
) {
  for (const column of columns) {
    const columnId = getColumnId(column)

    if (columnId) {
      metaByColumnId.set(columnId, column.meta ?? {})
    }

    if ("columns" in column && column.columns) {
      flattenColumnMeta(column.columns, metaByColumnId)
    }
  }

  return metaByColumnId
}

export function normalizeUpdater<T>(updater: Updater<T>, current: T) {
  return typeof updater === "function" ? (updater as (old: T) => T)(current) : updater
}

function parseDateRange(value: string): DateRangeFilterValue {
  if (value.startsWith(JSON_VALUE_PREFIX)) {
    return parseJsonFilterValue(value) as DateRangeFilterValue
  }

  const [from, to] = value.split("..")

  return {
    from: from || undefined,
    to: to || undefined,
  }
}

function parseJsonFilterValue(value: string) {
  try {
    return JSON.parse(decodeURIComponent(value.slice(JSON_VALUE_PREFIX.length)))
  } catch {
    return {}
  }
}

function serializeJsonFilterValue(value: object) {
  return `${JSON_VALUE_PREFIX}${encodeURIComponent(JSON.stringify(value))}`
}

function serializeDateRange(value: DateRangeFilterValue) {
  if (!value.from && !value.to) {
    return ""
  }

  return `${value.from ?? ""}..${value.to ?? ""}`
}

function decodeListValue(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseListFilterValue(value: string) {
  return value ? value.split(",").filter(Boolean).map(decodeListValue) : []
}

function serializeListFilterValue(value: unknown[]) {
  return value.length > 0
    ? value.map((item) => encodeURIComponent(String(item))).join(",")
    : ""
}

export type TableUrlState = {
  sorting: SortingState
  columnFilters: ColumnFiltersState
  globalFilter: string
}

export function parseUrlState(
  searchParams: URLSearchParams,
  metaByColumnId: Map<string, Partial<DataTableColumnMeta>>
): TableUrlState {
  const sorting = searchParams
    .getAll("sort")
    .map((sortValue) => {
      const [id, direction] = sortValue.split(",")

      if (!id) {
        return null
      }

      return {
        id,
        desc: direction === "desc",
      }
    })
    .filter((sort): sort is SortingState[number] => Boolean(sort))

  const columnFilters: ColumnFiltersState = []

  searchParams.forEach((value, key) => {
    if (!key.startsWith(FILTER_PREFIX)) {
      return
    }

    const columnId = key.slice(FILTER_PREFIX.length)
    const meta = metaByColumnId.get(columnId)

    if (meta?.filterType === "search") {
      columnFilters.push({
        id: columnId,
        value: value.startsWith(JSON_VALUE_PREFIX)
          ? parseJsonFilterValue(value)
          : value,
      })
      return
    }

    if (meta?.filterType === "number") {
      columnFilters.push({ id: columnId, value: parseJsonFilterValue(value) })
      return
    }

    if (meta?.filterType === "dateRange") {
      columnFilters.push({ id: columnId, value: parseDateRange(value) })
      return
    }

    columnFilters.push({
      id: columnId,
      value: parseListFilterValue(value),
    })
  })

  return {
    sorting,
    columnFilters,
    globalFilter: searchParams.get("search") ?? "",
  }
}

function serializeFilterValue(value: unknown) {
  if (Array.isArray(value)) {
    return serializeListFilterValue(value)
  }

  if (typeof value === "string") {
    return value.trim()
  }

  if (value && typeof value === "object") {
    const rangeValue = value as DateRangeFilterValue

    if ("from" in rangeValue || "to" in rangeValue) {
      return serializeDateRange(rangeValue)
    }

    return serializeJsonFilterValue(value)
  }

  return ""
}

export function serializeUrlState(state: TableUrlState, baseParams: URLSearchParams) {
  const nextParams = new URLSearchParams(baseParams.toString())

  nextParams.delete("sort")
  nextParams.delete("search")

  Array.from(nextParams.keys())
    .filter((key) => key.startsWith(FILTER_PREFIX))
    .forEach((key) => nextParams.delete(key))

  state.sorting.forEach((sort) => {
    nextParams.append("sort", `${sort.id},${sort.desc ? "desc" : "asc"}`)
  })

  const trimmedGlobalFilter = state.globalFilter.trim()
  if (trimmedGlobalFilter) {
    nextParams.set("search", trimmedGlobalFilter)
  }

  state.columnFilters.forEach((filter) => {
    const serializedValue = serializeFilterValue(filter.value)

    if (serializedValue) {
      nextParams.set(`${FILTER_PREFIX}${filter.id}`, serializedValue)
    }
  })

  return nextParams
}

export function tableStateEquals(left: TableUrlState, right: TableUrlState) {
  return JSON.stringify(left) === JSON.stringify(right)
}
