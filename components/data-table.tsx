"use client"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  type ColumnDef,
  type FilterFn,
  type Row,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMemo } from "react"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { ColumnHeaderMenu } from "@/components/data-table/column-header-menu"
import { applySmartColumnDefaults, globalTextFilter } from "@/components/data-table/table-logic"
import { useTableUrlSync } from "@/hooks/use-table-url-sync"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  urlSync?: boolean
  enableMultiSort?: boolean
  onRowClick?: (row: Row<TData>) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Пошук...",
  urlSync = true,
  enableMultiSort = false,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const smartColumns = useMemo(() => applySmartColumnDefaults(columns), [columns])
  const {
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    clearTableState,
  } = useTableUrlSync({
    columns: smartColumns,
    enabled: urlSync,
  })

  const table = useReactTable<TData>({
    data,
    columns: smartColumns as ColumnDef<TData, any>[],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onGlobalFilterChange: setGlobalFilter,
    enableMultiSort,
    globalFilterFn: globalTextFilter as FilterFn<TData>,
    getColumnCanGlobalFilter: (column) =>
      column.columnDef.meta?.searchable === true,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  const hasGlobalSearch = table
    .getAllLeafColumns()
    .some((column) => column.columnDef.meta?.searchable === true)
  const hasActiveTableState =
    sorting.length > 0 || columnFilters.length > 0 || Boolean(globalFilter)
  const pageIndex = table.getState().pagination.pageIndex + 1
  const pageCount = table.getPageCount()

  return (
    <div className="space-y-4">
      {(hasGlobalSearch || hasActiveTableState) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {hasGlobalSearch ? (
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                aria-label="Пошук у таблиці"
                value={globalFilter ?? ""}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
                className="pl-9"
              />
            </div>
          ) : (
            <div />
          )}

          {hasActiveTableState && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearTableState}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
              Очистити все
            </Button>
          )}
        </div>
      )}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isLastHeader = header.index === headerGroup.headers.length - 1
                  const minWidth = header.column.columnDef.meta?.minWidth

                  return (
                    <TableHead
                      key={header.id}
                      className={cn("group/th", minWidth && "whitespace-nowrap")}
                      style={minWidth ? { minWidth } : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <ColumnHeaderMenu
                          header={header}
                          align={isLastHeader ? "end" : "start"}
                        />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer hover:bg-slate-50" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={smartColumns.length} className="h-24 text-center">
                  Нічого не знайдено.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Сторінка {pageCount === 0 ? 0 : pageIndex} з {pageCount}
        </p>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
            Попередня
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Наступна
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
