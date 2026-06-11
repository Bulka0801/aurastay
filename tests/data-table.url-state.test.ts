import { describe, expect, it } from "vitest"

import {
  flattenColumnMeta,
  parseUrlState,
  serializeUrlState,
  tableStateEquals,
} from "@/hooks/table-url-state"
import { buildReservationColumns, reservationFixtures } from "@/tests/support/reservations-table-model"

describe("Table URL state persistence", () => {
  it("serializes and parses a mixed search, filter, and sorting state", () => {
    const columns = buildReservationColumns(reservationFixtures)
    const metaByColumnId = flattenColumnMeta(columns)
    const baseParams = new URLSearchParams("page=2&view=week")
    const state = {
      sorting: [{ id: "total_amount", desc: true }],
      columnFilters: [
        { id: "status", value: ["confirmed", "checked_in"] },
        { id: "check_in_date", value: { from: "2026-05-22", to: "2026-05-23" } },
        { id: "total_amount", value: { operator: "greaterThan", value: "12000" } },
      ],
      globalFilter: "  anna petrova  ",
    }

    const serialized = serializeUrlState(state, baseParams)
    expect(serialized.get("page")).toBe("2")
    expect(serialized.get("view")).toBe("week")
    expect(serialized.get("search")).toBe("anna petrova")
    expect(serialized.get("sort")).toBe("total_amount,desc")
    expect(serialized.get("filter_status")).toBe("confirmed,checked_in")
    expect(serialized.get("filter_check_in_date")).toBe("2026-05-22..2026-05-23")
    expect(serialized.get("filter_total_amount")).toContain("json:")

    const parsed = parseUrlState(serialized, metaByColumnId)
    expect(tableStateEquals(parsed, {
      sorting: [{ id: "total_amount", desc: true }],
      columnFilters: [
        { id: "status", value: ["confirmed", "checked_in"] },
        { id: "check_in_date", value: { from: "2026-05-22", to: "2026-05-23" } },
        { id: "total_amount", value: { operator: "greaterThan", value: "12000" } },
      ],
      globalFilter: "anna petrova",
    })).toBe(true)
  })

  it("round-trips persisted state back into the table after a refresh", () => {
    const columns = buildReservationColumns(reservationFixtures)
    const metaByColumnId = flattenColumnMeta(columns)

    const original = {
      sorting: [{ id: "check_in_date", desc: false }],
      columnFilters: [
        { id: "guest", value: { operator: "contains", value: "Anna" } },
        { id: "roomNumber", value: ["101"] },
      ],
      globalFilter: "anna",
    }
    const query = serializeUrlState(original, new URLSearchParams("page=3"))
    const parsed = parseUrlState(query, metaByColumnId)

    expect(tableStateEquals(parsed, original)).toBe(true)
  })

  it("keeps unrelated query parameters when clearing the table state", () => {
    const columns = buildReservationColumns(reservationFixtures)
    const metaByColumnId = flattenColumnMeta(columns)
    const current = new URLSearchParams("page=4&tab=reservations&search=anna&sort=guest,asc&filter_status=confirmed")

    const cleared = serializeUrlState(
      {
        sorting: [],
        columnFilters: [],
        globalFilter: "",
      },
      current
    )

    expect(cleared.toString()).toBe("page=4&tab=reservations")
    expect(parseUrlState(cleared, metaByColumnId)).toEqual({
      sorting: [],
      columnFilters: [],
      globalFilter: "",
    })
  })

  it("ignores invalid filter payloads without breaking the parsed state", () => {
    const columns = buildReservationColumns(reservationFixtures)
    const metaByColumnId = flattenColumnMeta(columns)
    const params = new URLSearchParams(
      "filter_check_in_date=json%3A%7Bbroken&filter_status=confirmed,checked_in&search="
    )

    const parsed = parseUrlState(params, metaByColumnId)

    expect(parsed.globalFilter).toBe("")
    expect(parsed.columnFilters).toEqual([
      { id: "check_in_date", value: {} },
      { id: "status", value: ["confirmed", "checked_in"] },
    ])
  })
})
