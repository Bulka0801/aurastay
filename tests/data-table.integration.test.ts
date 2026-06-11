import { afterEach, describe, expect, it, vi } from "vitest"

import { createHeadlessTable } from "@/tests/support/create-headless-table"
import {
  buildLargeReservationDataset,
  buildReservationColumns,
  reservationFixtures,
} from "@/tests/support/reservations-table-model"

function createReservationsTable(
  rows = reservationFixtures,
  options: {
    pageSize?: number
    initialState?: Parameters<typeof createHeadlessTable>[0]["initialState"]
  } = {}
) {
  return createHeadlessTable({
    columns: buildReservationColumns(rows),
    data: rows,
    enableMultiSort: true,
    pageSize: options.pageSize,
    initialState: options.initialState,
  })
}

describe("Reservations table searching", () => {
  it("supports exact text search in the reservation number column", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("reservation_number")?.setFilterValue({
      operator: "equals",
      value: "AUR-2026/04825",
    })

    expect(harness.getRowIds()).toEqual(["res-005"])
  })

  it("supports partial, case-insensitive, special-character, and space-based search in the guest column", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("guest")?.setFilterValue({
      operator: "contains",
      value: "Anna",
    })
    expect(harness.getRowIds()).toEqual(["res-001", "res-007"])

    harness.table.getColumn("guest")?.setFilterValue({
      operator: "contains",
      value: "o'connor",
    })
    expect(harness.getRowIds()).toEqual(["res-001"])

    harness.table.getColumn("guest")?.setFilterValue({
      operator: "contains",
      value: "Ірина Коваль",
    })
    expect(harness.getRowIds()).toEqual(["res-002"])

    harness.table.getColumn("guest")?.setFilterValue({
      operator: "contains",
      value: "vip@example.com",
    })
    expect(harness.getRowIds()).toEqual(["res-001"])
  })

  it("treats empty queries as no-op and returns no matches for nonexistent records", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("guest")?.setFilterValue({
      operator: "contains",
      value: "   ",
    })
    expect(harness.getRowIds()).toHaveLength(reservationFixtures.length)

    harness.table.getColumn("guest")?.setFilterValue({
      operator: "contains",
      value: "does-not-exist",
    })
    expect(harness.getRowIds()).toEqual([])
  })

  it("supports global search across guest, room number, and reservation number", () => {
    const harness = createReservationsTable()

    harness.table.setGlobalFilter("AUR-2026/04825")
    expect(harness.getRowIds()).toEqual(["res-005"])

    harness.table.setGlobalFilter("101")
    expect(harness.getRowIds()).toEqual(["res-001"])

    harness.table.setGlobalFilter("anna")
    expect(harness.getRowIds()).toEqual(["res-001", "res-007"])
  })
})

describe("Reservations table filtering", () => {
  it("applies a single status filter", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("status")?.setFilterValue(["confirmed"])

    expect(harness.getRowIds()).toEqual(["res-001", "res-007", "res-008"])
  })

  it("applies multiple filters together", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("status")?.setFilterValue(["confirmed", "checked_in"])
    harness.table.getColumn("roomNumber")?.setFilterValue(["101", "205"])

    expect(harness.getRowIds()).toEqual(["res-001", "res-002"])
  })

  it("supports custom date range filtering with inclusive boundaries", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("check_in_date")?.setFilterValue({
      from: "2026-05-22",
      to: "2026-05-23",
    })

    expect(harness.getRowIds()).toEqual(["res-001", "res-002", "res-007"])
  })

  it("supports quick date presets used in the reservations workflow", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-23T12:00:00.000Z"))

    const todayHarness = createReservationsTable()
    todayHarness.table.getColumn("check_in_date")?.setFilterValue({ preset: "today" })
    expect(todayHarness.getRowIds()).toEqual(["res-001", "res-007"])

    const overdueHarness = createReservationsTable()
    overdueHarness.table.getColumn("check_out_date")?.setFilterValue({ preset: "overdueDepartures" })
    expect(overdueHarness.getRowIds()).toEqual(["res-009", "res-010"])

    const longStayHarness = createReservationsTable()
    longStayHarness.table.getColumn("check_out_date")?.setFilterValue({ preset: "longStays" })
    expect(longStayHarness.getRowIds()).toEqual(["res-003", "res-006", "res-007", "res-009"])

    vi.useRealTimers()
  })

  it("returns no rows for conflicting filters and can be reset to the full dataset", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-23T12:00:00.000Z"))

    const harness = createReservationsTable()

    harness.table.getColumn("status")?.setFilterValue(["cancelled"])
    harness.table.getColumn("check_in_date")?.setFilterValue({ preset: "today" })
    expect(harness.getRowIds()).toEqual([])

    harness.table.resetColumnFilters()
    harness.table.setGlobalFilter("")
    harness.table.resetSorting()

    expect(harness.getRowIds()).toHaveLength(reservationFixtures.length)

    vi.useRealTimers()
  })
})

describe("Reservations table sorting", () => {
  it("sorts numeric values ascending and descending", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("total_amount")?.toggleSorting(false)
    expect(harness.getRowIds()).toEqual([
      "res-004",
      "res-010",
      "res-003",
      "res-006",
      "res-001",
      "res-007",
      "res-008",
      "res-005",
      "res-002",
      "res-009",
    ])

    harness.table.getColumn("total_amount")?.toggleSorting(true)
    expect(harness.getRowIds()).toEqual([
      "res-009",
      "res-002",
      "res-005",
      "res-001",
      "res-007",
      "res-008",
      "res-006",
      "res-003",
      "res-010",
      "res-004",
    ])
  })

  it("sorts date values ascending and descending with stable ordering for duplicates", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("check_in_date")?.toggleSorting(false)
    expect(harness.getRowIds()).toEqual([
      "res-006",
      "res-009",
      "res-004",
      "res-003",
      "res-010",
      "res-005",
      "res-002",
      "res-001",
      "res-007",
      "res-008",
    ])

    harness.table.getColumn("check_in_date")?.toggleSorting(true)
    expect(harness.getRowIds()).toEqual([
      "res-008",
      "res-001",
      "res-007",
      "res-002",
      "res-005",
      "res-010",
      "res-003",
      "res-004",
      "res-006",
      "res-009",
    ])
  })

  it("sorts text values and keeps empty values predictable", () => {
    const harness = createReservationsTable()

    harness.table.getColumn("guest")?.toggleSorting(false)
    expect(harness.getRowIds()[0]).toBe("res-008")
    expect(harness.getRowIds().indexOf("res-001")).toBeLessThan(harness.getRowIds().indexOf("res-007"))

    harness.table.getColumn("guest")?.toggleSorting(true)
    expect(harness.getRowIds()[harness.getRowIds().length - 1]).toBe("res-008")
  })
})

describe("Reservations table production edge cases", () => {
  it("keeps filters and search working together while pagination remains on the current page", () => {
    const harness = createReservationsTable(reservationFixtures, { pageSize: 2 })

    harness.table.nextPage()
    expect(harness.getState().pagination.pageIndex).toBe(1)

    harness.table.setGlobalFilter("anna")
    harness.table.getColumn("status")?.setFilterValue(["confirmed"])
    harness.table.getColumn("roomNumber")?.setFilterValue(["101"])

    expect(harness.getState().pagination.pageIndex).toBe(1)
    expect(harness.getRowIds()).toEqual([])
  })

  it("handles a large dataset without breaking search or pagination behavior", () => {
    const rows = buildLargeReservationDataset(1000)
    const harness = createReservationsTable(rows, { pageSize: 25 })

    harness.table.getColumn("reservation_number")?.setFilterValue({
      operator: "equals",
      value: "BULK-2026-MARKER-721",
    })

    expect(harness.getRowIds()).toEqual(["bulk-501"])
    expect(harness.table.getCanNextPage()).toBe(false)
    expect(harness.table.getCanPreviousPage()).toBe(false)
  })
})

afterEach(() => {
  vi.useRealTimers()
})
