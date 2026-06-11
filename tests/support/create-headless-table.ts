import {
  createTable,
  functionalUpdate,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type RowData,
  type Table,
  type TableState,
} from "@tanstack/react-table"

import { globalTextFilter, applySmartColumnDefaults } from "@/components/data-table/table-logic"

type CreateHeadlessTableOptions<TData extends RowData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  initialState?: Partial<TableState>
  pageSize?: number
  enableMultiSort?: boolean
}

export function createHeadlessTable<TData extends RowData>({
  columns,
  data,
  initialState = {},
  pageSize = 10,
  enableMultiSort = false,
}: CreateHeadlessTableOptions<TData>) {
  const smartColumns = applySmartColumnDefaults(columns)

  let table!: Table<TData>

  let state: TableState = {
    columnFilters: [],
    columnOrder: [],
    columnPinning: { left: [], right: [] },
    columnSizing: {},
    columnSizingInfo: {
      columnSizingStart: [],
      deltaOffset: 0,
      deltaPercentage: 0,
      isResizingColumn: false,
      startOffset: null,
      startSize: null,
    },
    columnVisibility: {},
    expanded: {},
    globalFilter: "",
    grouping: [],
    pagination: {
      pageIndex: 0,
      pageSize,
    },
    rowPinning: { bottom: [], top: [] },
    rowSelection: {},
    sorting: [],
    ...initialState,
  }

  const syncState = (nextState: TableState) => {
    state = nextState

    table?.setOptions((currentOptions) => ({
      ...currentOptions,
      state,
    }))
  }

  table = createTable<TData>({
    data,
    columns: smartColumns as ColumnDef<TData, any>[],
    state,
    autoResetPageIndex: true,
    onStateChange: (updater) => {
      syncState(functionalUpdate(updater, state))
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: globalTextFilter as any,
    getColumnCanGlobalFilter: (column) =>
      column.columnDef.meta?.searchable === true,
    enableMultiSort,
    renderFallbackValue: null,
  })

  syncState({ ...table.initialState, ...state })

  return {
    table,
    getState: () => state,
    setState: syncState,
    getRowIds: () =>
      table.getRowModel().rows.map((row) => (row.original as { id: string }).id),
  }
}
