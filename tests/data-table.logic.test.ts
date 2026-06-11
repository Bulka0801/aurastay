import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  EMPTY_FILTER_LABEL,
  EMPTY_FILTER_VALUE,
  getFilterLabel,
  normalizeFilterValue,
} from "@/components/data-table/filter-utils"
import {
  applySmartColumnDefaults,
  checkboxFilter,
  dateRangeFilter,
  getDatePresetRange,
  globalTextFilter,
  numberFilter,
  textFilter,
  toDateInputValue,
} from "@/components/data-table/table-logic"
import { flattenColumnMeta, parseUrlState, serializeUrlState } from "@/hooks/table-url-state"
import {
  createReservationColumns,
  createReservationTable,
  makeLargeReservationFixtures,
  makeReservationFixtures,
} from "@/tests/support/reservations.fixture"

function mockRow(values: Record<string, unknown>, original: Record<string, unknown> = {}) {
  return {
    getValue: (columnId: string) => values[columnId],
    original,
  } as any
}

describe("Data table filter utilities", () => {
  it("normalizes empty filter values to the sentinel token", () => {
    expect(normalizeFilterValue(null)).toBe(EMPTY_FILTER_VALUE)
    expect(normalizeFilterValue(undefined)).toBe(EMPTY_FILTER_VALUE)
    expect(normalizeFilterValue("")).toBe(EMPTY_FILTER_VALUE)
    expect(normalizeFilterValue("101")).toBe("101")
  })

  it("returns the localized empty label and custom labels", () => {
    expect(getFilterLabel(EMPTY_FILTER_VALUE)).toBe(EMPTY_FILTER_LABEL)
    expect(getFilterLabel("confirmed", { confirmed: "Підтверджено" })).toBe("Підтверджено")
    expect(getFilterLabel("checked_in")).toBe("checked_in")
  })
})

describe("Column filter helpers", () => {
  it("supports checkbox filtering with selected and empty values", () => {
    const row = mockRow({ status: "confirmed", roomNumber: null })

    expect(checkboxFilter(row, "status", ["confirmed"])).toBe(true)
    expect(checkboxFilter(row, "status", ["checked_in"])).toBe(false)
    expect(checkboxFilter(row, "status", undefined)).toBe(true)
    expect(checkboxFilter(row, "status", [])).toBe(false)
    expect(checkboxFilter(row, "roomNumber", [EMPTY_FILTER_VALUE])).toBe(true)
  })

  it("supports text search with exact, partial, case-insensitive and special-character matches", () => {
    const row = mockRow({
      reservation_number: "AUR-2026/04825",
      guest: "Anna Maria O'Connor anna.oconnor+vip@example.com +380671234567",
    })

    expect(textFilter(row, "reservation_number", { operator: "equals", value: "AUR-2026/04825" })).toBe(true)
    expect(textFilter(row, "reservation_number", { operator: "contains", value: "0482" })).toBe(true)
    expect(textFilter(row, "reservation_number", { operator: "startsWith", value: "aur-2026/" })).toBe(true)
    expect(textFilter(row, "guest", { operator: "contains", value: "anna maria" })).toBe(true)
    expect(textFilter(row, "guest", { operator: "contains", value: "O'CONNOR" })).toBe(true)
    expect(textFilter(row, "guest", { operator: "contains", value: "vip@example.com" })).toBe(true)
    expect(textFilter(row, "guest", { operator: "contains", value: "   " })).toBe(true)
    expect(textFilter(row, "guest", { operator: "contains", value: "nonexistent" })).toBe(false)
  })

  it("supports global search across all searchable fields", () => {
    const row = mockRow({
      guest: "Anna Maria O'Connor anna.oconnor+vip@example.com +380671234567",
      roomNumber: "101",
      reservation_number: "AUR-2026/04825",
    })

    expect(globalTextFilter(row, "guest", "anna maria")).toBe(true)
    expect(globalTextFilter(row, "reservation_number", "AUR-2026/04825")).toBe(true)
    expect(globalTextFilter(row, "guest", "o'connor")).toBe(true)
    expect(globalTextFilter(row, "guest", "  ")).toBe(true)
    expect(globalTextFilter(row, "guest", "not-found")).toBe(false)
  })

  it("supports numeric comparisons and rejects conflicting ranges", () => {
    const row = mockRow({ total_amount: 12500 })

    expect(numberFilter(row, "total_amount", { operator: "equals", value: "12500" })).toBe(true)
    expect(numberFilter(row, "total_amount", { operator: "greaterThan", value: "12000" })).toBe(true)
    expect(numberFilter(row, "total_amount", { operator: "lessThan", value: "12000" })).toBe(false)
    expect(numberFilter(row, "total_amount", { operator: "between", min: "10000", max: "13000" })).toBe(true)
    expect(numberFilter(row, "total_amount", { operator: "between", min: "13000", max: "10000" })).toBe(false)
    expect(numberFilter(row, "total_amount", undefined)).toBe(true)
  })

  it("supports date range filtering, presets, and invalid input tolerance", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-23T12:00:00.000Z"))

    const todayRow = mockRow({ check_in_date: "2026-05-23" })
    const pastDepartureRow = mockRow(
      { check_out_date: "2026-05-22" },
      {
        status: "checked_in",
        check_in_date: "2026-05-13",
        check_out_date: "2026-05-22",
      }
    )
    const checkedOutRow = mockRow(
      { check_out_date: "2026-05-22" },
      {
        status: "checked_out",
        check_in_date: "2026-05-13",
        check_out_date: "2026-05-22",
      }
    )
    const longStayRow = mockRow(
      { check_out_date: "2026-05-15" },
      {
        status: "checked_in",
        check_in_date: "2026-05-01",
        check_out_date: "2026-05-15",
      }
    )

    expect(toDateInputValue(new Date("2026-05-23T12:00:00.000Z"))).toBe("2026-05-23")
    expect(getDatePresetRange("today")).toEqual({ from: "2026-05-23", to: "2026-05-23" })
    expect(getDatePresetRange("thisWeek")).toEqual({ from: "2026-05-18", to: "2026-05-24" })
    expect(getDatePresetRange("thisMonth")).toEqual({ from: "2026-05-01", to: "2026-05-31" })
    expect(getDatePresetRange("pastDates")).toEqual({ to: "2026-05-22" })
    expect(getDatePresetRange("futureDates")).toEqual({ from: "2026-05-24" })

    expect(dateRangeFilter(todayRow, "check_in_date", { preset: "today" })).toBe(true)
    expect(dateRangeFilter(todayRow, "check_in_date", { preset: "thisWeek" })).toBe(true)
    expect(dateRangeFilter(todayRow, "check_in_date", { from: "2026-05-22", to: "2026-05-24" })).toBe(true)
    expect(dateRangeFilter(todayRow, "check_in_date", { from: "2026-05-24", to: "2026-05-30" })).toBe(false)
    expect(dateRangeFilter(pastDepartureRow, "check_out_date", { preset: "overdueDepartures" })).toBe(true)
    expect(dateRangeFilter(checkedOutRow, "check_out_date", { preset: "overdueDepartures" })).toBe(false)
    expect(dateRangeFilter(longStayRow, "check_out_date", { preset: "longStays" })).toBe(true)
    expect(dateRangeFilter(todayRow, "check_in_date", { from: "invalid", to: "still-invalid" })).toBe(true)

    vi.useRealTimers()
  })

  it("applies smart defaults recursively to grouped columns", () => {
    const columns = applySmartColumnDefaults([
      {
        header: "Reservation",
        columns: [
          {
            accessorKey: "reservation_number",
            meta: {
              sortable: true,
              filterable: true,
              filterType: "search",
              searchable: true,
              dataType: "text",
            },
          },
          {
            accessorKey: "status",
            meta: {
              sortable: false,
              filterable: true,
              filterType: "checkbox",
              searchable: false,
              dataType: "enum",
            },
          },
        ],
      } as any,
    ]) as Array<{ columns?: Array<{ enableSorting?: boolean; enableColumnFilter?: boolean; enableGlobalFilter?: boolean }> }>

    expect(columns[0].columns?.[0].enableSorting).toBe(true)
    expect(columns[0].columns?.[0].enableColumnFilter).toBe(true)
    expect(columns[0].columns?.[0].enableGlobalFilter).toBe(true)
    expect(columns[0].columns?.[1].enableSorting).toBe(false)
    expect(columns[0].columns?.[1].enableColumnFilter).toBe(true)
  })
})

describe("AuraStay data table automation", () => {
  const frozenNow = new Date("2026-05-23T09:00:00+03:00")

  function getRowIds(table: ReturnType<typeof createReservationTable>["table"]) {
    return table.getRowModel().rows.map((row) => row.original.id)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(frozenNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("searching", () => {
    it("finds an exact reservation number match", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("4821")

      expect(getRowIds(table)).toEqual(["res-1001"])
    })

    it("finds partial guest name matches", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("maria")

      expect(getRowIds(table)).toEqual(["res-1003", "res-1007"])
    })

    it("is case-insensitive across searchable columns", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("OLENA")

      expect(getRowIds(table)).toEqual(["res-1001"])
    })

    it("matches special characters in guest data", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("o'connor+vip")

      expect(getRowIds(table)).toEqual(["res-1002"])
    })

    it("trims leading and trailing spaces in the query", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("  anna maria  ")

      expect(getRowIds(table)).toEqual(["res-1003"])
    })

    it("returns all rows for an empty query", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("   ")

      expect(table.getRowModel().rows).toHaveLength(12)
    })

    it("returns an empty state for a nonexistent record", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("does-not-exist")

      expect(table.getRowModel().rows).toHaveLength(0)
    })
  })

  describe("sorting", () => {
    it("sorts numeric values ascending and descending", () => {
      const ascending = createReservationTable(makeReservationFixtures())
      ascending.table.setSorting([{ id: "total_amount", desc: false }])

      expect(getRowIds(ascending.table).slice(0, 3)).toEqual([
        "res-1006",
        "res-1003",
        "res-1001",
      ])

      const descending = createReservationTable(makeReservationFixtures())
      descending.table.setSorting([{ id: "total_amount", desc: true }])

      expect(getRowIds(descending.table)[0]).toBe("res-1009")
    })

    it("sorts dates from oldest to newest", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setSorting([{ id: "check_in_date", desc: false }])

      expect(getRowIds(table).slice(0, 2)).toEqual(["res-1006", "res-1010"])
    })

    it("sorts text fields and keeps empty guest values visible", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setSorting([{ id: "guest", desc: false }])

      expect(getRowIds(table)[0]).toBe("res-1004")
    })

    it("keeps duplicate numeric values grouped in a stable order", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setSorting([{ id: "total_amount", desc: false }])

      const duplicateGroup = getRowIds(table).filter((id) =>
        ["res-1004", "res-1007", "res-1008"].includes(id)
      )

      expect(duplicateGroup).toEqual(["res-1004", "res-1007", "res-1008"])
    })
  })

  describe("filtering", () => {
    it("filters by a single status value", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([{ id: "status", value: ["confirmed"] }])

      expect(getRowIds(table)).toEqual(["res-1001", "res-1007", "res-1009", "res-1012"])
    })

    it("filters by multiple status values", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([{ id: "status", value: ["confirmed", "checked_in"] }])

      expect(getRowIds(table)).toEqual([
        "res-1001",
        "res-1002",
        "res-1007",
        "res-1008",
        "res-1009",
        "res-1010",
        "res-1012",
      ])
    })

    it("combines status and room filters", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([
        { id: "status", value: ["confirmed"] },
        { id: "roomNumber", value: ["201"] },
      ])

      expect(getRowIds(table)).toEqual(["res-1007"])
    })

    it("resets filters back to the unfiltered dataset", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([{ id: "status", value: ["confirmed"] }])
      expect(table.getRowModel().rows).toHaveLength(4)

      table.setColumnFilters([])
      expect(table.getRowModel().rows).toHaveLength(12)
    })

    it("returns no rows for a conflicting filter combination", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([
        { id: "status", value: ["checked_out"] },
        {
          id: "check_out_date",
          value: { preset: "overdueDepartures" },
        },
      ])

      expect(table.getRowModel().rows).toHaveLength(0)
    })

    it("returns no rows for an invalid numeric filter value", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([
        {
          id: "total_amount",
          value: { operator: "equals", value: "abc" },
        },
      ])

      expect(table.getRowModel().rows).toHaveLength(0)
    })

    it("returns no rows for an invalid date range", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([
        {
          id: "check_in_date",
          value: { from: "2026-05-26", to: "2026-05-23" },
        },
      ])

      expect(table.getRowModel().rows).toHaveLength(0)
    })

    it("applies a custom date range", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([
        {
          id: "check_in_date",
          value: { from: "2026-05-23", to: "2026-05-24" },
        },
      ])

      expect(getRowIds(table)).toEqual([
        "res-1001",
        "res-1002",
        "res-1007",
        "res-1008",
        "res-1011",
      ])
    })

    it("supports the today preset with a frozen system date", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([
        {
          id: "check_in_date",
          value: { preset: "today" },
        },
      ])

      expect(getRowIds(table)).toEqual(["res-1001", "res-1007", "res-1008", "res-1011"])
    })

    it("supports the long stay preset", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([
        {
          id: "check_out_date",
          value: { preset: "longStays" },
        },
      ])

      expect(getRowIds(table)).toEqual(["res-1009"])
    })

    it("supports empty checkbox selections as a negative case", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setColumnFilters([{ id: "status", value: [] }])

      expect(table.getRowModel().rows).toHaveLength(0)
    })
  })

  describe("combined interactions", () => {
    it("narrows results when search and filters are applied together", () => {
      const { table } = createReservationTable(makeReservationFixtures())

      table.setGlobalFilter("anna")
      table.setColumnFilters([{ id: "status", value: ["confirmed"] }])

      expect(getRowIds(table)).toEqual(["res-1007"])
    })

    it("keeps pagination coherent when a new filter is applied", () => {
      const { table } = createReservationTable(makeReservationFixtures(), {
        pagination: { pageIndex: 1, pageSize: 2 },
      })

      expect(table.getState().pagination?.pageIndex).toBe(1)

      table.setColumnFilters([{ id: "status", value: ["confirmed"] }])

      expect(table.getState().pagination?.pageIndex).toBe(1)
      expect(getRowIds(table)).toEqual(["res-1009", "res-1012"])
    })
  })

  describe("large datasets", () => {
    it("keeps sorting and filtering stable with a large dataset", () => {
      const largeData = makeLargeReservationFixtures(500)
      const { table } = createReservationTable(largeData, {
        pagination: { pageIndex: 0, pageSize: 500 },
      })

      table.setSorting([{ id: "total_amount", desc: true }])

      expect(table.getRowModel().rows).toHaveLength(500)
      expect(table.getRowModel().rows[0].original.total_amount).toBeGreaterThanOrEqual(
        table.getRowModel().rows[1].original.total_amount
      )
    })
  })

  describe("date helpers", () => {
    it("builds deterministic preset ranges for the frozen date", () => {
      expect(toDateInputValue(frozenNow)).toBe("2026-05-23")
      expect(getDatePresetRange("today")).toEqual({
        from: "2026-05-23",
        to: "2026-05-23",
      })
      expect(getDatePresetRange("thisWeek")).toEqual({
        from: "2026-05-18",
        to: "2026-05-24",
      })
      expect(getDatePresetRange("thisMonth")).toEqual({
        from: "2026-05-01",
        to: "2026-05-31",
      })
      expect(getDatePresetRange("pastDates")).toEqual({
        to: "2026-05-22",
      })
      expect(getDatePresetRange("futureDates")).toEqual({
        from: "2026-05-24",
      })
    })
  })

  describe("url state persistence", () => {
    it("round-trips sorting, search, and filter state through the URL", () => {
      const columns = createReservationColumns()
      const metaByColumnId = flattenColumnMeta(columns)
      const original = {
        sorting: [{ id: "total_amount", desc: true }],
        columnFilters: [
          { id: "status", value: ["confirmed", "checked_in"] },
          {
            id: "check_in_date",
            value: { from: "2026-05-23", to: "2026-05-24" },
          },
          {
            id: "guest",
            value: { operator: "contains", value: "O'Connor" },
          },
        ],
        globalFilter: "anna",
      }
      const params = serializeUrlState(original, new URLSearchParams("page=2"))

      expect(params.get("page")).toBe("2")
      expect(params.get("search")).toBe("anna")

      const parsed = parseUrlState(params, metaByColumnId)

      expect(parsed).toEqual(original)
    })

    it("removes table state from the URL when everything is cleared", () => {
      const cleared = serializeUrlState(
        { sorting: [], columnFilters: [], globalFilter: "" },
        new URLSearchParams("page=3&tab=reservations")
      )

      expect(cleared.toString()).toBe("page=3&tab=reservations")
    })

    it("survives malformed encoded filter values without throwing", () => {
      const columns = createReservationColumns()
      const metaByColumnId = flattenColumnMeta(columns)
      const params = new URLSearchParams("filter_guest=json:%7Bbad&filter_status=confirmed")

      expect(() => parseUrlState(params, metaByColumnId)).not.toThrow()
      expect(parseUrlState(params, metaByColumnId).columnFilters).toHaveLength(2)
    })
  })

  describe("filter helper coverage", () => {
    it("keeps pure filter helpers aligned with the table behavior", () => {
      const row = {
        original: makeReservationFixtures()[0],
        getValue: (columnId: string) =>
          columnId === "reservation_number"
            ? "4821"
            : columnId === "status"
              ? "confirmed"
              : columnId === "total_amount"
                ? 2400
                : columnId === "check_in_date"
                  ? "2026-05-23"
                  : "",
      }

      expect(textFilter(row as any, "reservation_number", { operator: "equals", value: "4821" })).toBe(true)
      expect(globalTextFilter(row as any, "reservation_number", "482")).toBe(true)
      expect(numberFilter(row as any, "total_amount", { operator: "greaterThan", value: "2000" })).toBe(true)
      expect(dateRangeFilter(row as any, "check_in_date", { preset: "today" })).toBe(true)
    })

    it("applies smart defaults recursively to grouped columns", () => {
      const columns = applySmartColumnDefaults([
        {
          header: "Reservation",
          columns: [
            {
              accessorKey: "reservation_number",
              meta: {
                sortable: true,
                filterable: true,
                filterType: "search",
                searchable: true,
                dataType: "text",
              },
            },
            {
              accessorKey: "status",
              meta: {
                sortable: false,
                filterable: true,
                filterType: "checkbox",
                searchable: false,
                dataType: "enum",
              },
            },
          ],
        } as any,
      ]) as Array<{
        columns?: Array<{
          enableSorting?: boolean
          enableColumnFilter?: boolean
          enableGlobalFilter?: boolean
        }>
      }>

      expect(columns[0].columns?.[0].enableSorting).toBe(true)
      expect(columns[0].columns?.[0].enableColumnFilter).toBe(true)
      expect(columns[0].columns?.[0].enableGlobalFilter).toBe(true)
      expect(columns[0].columns?.[1].enableSorting).toBe(false)
      expect(columns[0].columns?.[1].enableColumnFilter).toBe(true)
    })
  })
})

afterEach(() => {
  vi.useRealTimers()
})
