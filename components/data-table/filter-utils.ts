"use client"

export const EMPTY_FILTER_VALUE = "__data_table_empty__"
export const EMPTY_FILTER_LABEL = "(Пусто)"

export function normalizeFilterValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return EMPTY_FILTER_VALUE
  }

  return String(value)
}

export function getFilterLabel(
  value: string,
  labels?: Record<string, string>
) {
  if (value === EMPTY_FILTER_VALUE) {
    return EMPTY_FILTER_LABEL
  }

  return labels?.[value] ?? value
}
