"use client"

import type { RowData } from "@tanstack/react-table"

export type DataTableFilterType =
  | "checkbox"
  | "search"
  | "number"
  | "dateRange"
  | false

export type DataTableDataType = "text" | "number" | "date" | "enum"

export interface DataTableColumnMeta {
  sortable: boolean
  filterable: boolean
  filterType?: DataTableFilterType
  searchable: boolean
  dataType: DataTableDataType
  filterOptions?: string[]
  filterLabels?: Record<string, string>
  filterOptionMeta?: Record<
    string,
    {
      description?: string
      colorClassName?: string
      icon?: string
    }
  >
  filterOptionGroups?: Array<{
    label: string
    description?: string
    values: string[]
  }>
  filterGroupMode?: "shortcuts" | "sections" | "collapsibleSections"
  preserveFilterOptionOrder?: boolean
  searchPlaceholder?: string
  filterHelpText?: string
  datePresets?: Array<{
    value: string
    label: string
    description?: string
  }>
  sortLabel?: {
    asc: string
    desc: string
  }
  minWidth?: number
}

export type DateRangeFilterValue = {
  preset?: string
  from?: string
  to?: string
}

export type TextFilterValue = {
  operator: "contains" | "startsWith" | "equals"
  value: string
}

export type NumberFilterValue = {
  operator: "equals" | "greaterThan" | "lessThan" | "between"
  value?: string
  min?: string
  max?: string
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue>
    extends Partial<DataTableColumnMeta> {}
}
