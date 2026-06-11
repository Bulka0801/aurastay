import { describe, expect, it } from "vitest"

import {
  applyRoomRackFilters,
  filterRackBlocks,
  type RackRoomStateFilter,
} from "@/lib/room-rack/filters"
import { roomMatchesStateFilter } from "@/lib/rooms/availability"
import { makeLargeRoomRackFixtures, makeRoomRackFixtures } from "@/tests/support/room-rack.fixture"

describe("Room rack status filters", () => {
  it("filters rooms by occupancy status and keeps only visible room blocks", () => {
    const { rooms, blocks } = makeRoomRackFixtures()

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "",
      roomTypeFilter: "all",
      roomStateFilter: "occupancy:vacant",
      reservationStatusFilter: "all",
    })

    expect(result.rooms.map((room) => room.id)).toEqual([
      "room-101",
      "room-201",
      "room-202",
      "room-301",
      "room-401",
      "room-999",
    ])
    expect(result.blocks.every((block) => block.room_id !== "room-102")).toBe(true)
  })

  it("filters rooms by housekeeping status, including inspected", () => {
    const { rooms, blocks } = makeRoomRackFixtures()

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "",
      roomTypeFilter: "all",
      roomStateFilter: "housekeeping:inspected",
      reservationStatusFilter: "all",
    })

    expect(result.rooms.map((room) => room.id)).toEqual(["room-202"])
    expect(result.blocks.map((block) => block.room_id)).toEqual([
      "room-202",
      "room-202",
    ])
  })

  it("filters rooms by operational status, including operational", () => {
    const { rooms, blocks } = makeRoomRackFixtures()

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "",
      roomTypeFilter: "all",
      roomStateFilter: "operational:operational",
      reservationStatusFilter: "all",
    })

    expect(result.rooms.map((room) => room.id)).toEqual([
      "room-101",
      "room-102",
      "room-201",
      "room-202",
      "room-401",
    ])
    expect(result.blocks.every((block) => block.room_id !== "room-301")).toBe(true)
    expect(result.blocks.every((block) => block.room_id !== "room-999")).toBe(true)
  })

  it("filters reservation status and hides rooms without matching reservations", () => {
    const { rooms, blocks } = makeRoomRackFixtures()

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "",
      roomTypeFilter: "all",
      roomStateFilter: "all",
      reservationStatusFilter: "pending",
    })

    expect(result.rooms.map((room) => room.id)).toEqual(["room-101", "room-202"])
    expect(result.blocks.every((block) => block.status === "pending")).toBe(true)
    expect(result.blocks.map((block) => block.room_id)).toEqual(["room-101", "room-202"])
  })

  it("combines room status, reservation status, and search with special characters", () => {
    const { rooms, blocks } = makeRoomRackFixtures()

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "o'connor",
      roomTypeFilter: "all",
      roomStateFilter: "occupancy:vacant",
      reservationStatusFilter: "pending",
    })

    expect(result.rooms.map((room) => room.id)).toEqual(["room-101"])
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].reservation_number).toBe("AUR-2026/1001")
  })

  it("treats whitespace-only search as an empty query", () => {
    const { rooms, blocks } = makeRoomRackFixtures()

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "   ",
      roomTypeFilter: "all",
      roomStateFilter: "all",
      reservationStatusFilter: "confirmed",
    })

    expect(result.rooms.map((room) => room.id)).toEqual(["room-101"])
    expect(result.blocks.map((block) => block.room_id)).toEqual(["room-101"])
  })

  it("returns empty visible rooms and blocks for nonexistent search terms", () => {
    const { rooms, blocks } = makeRoomRackFixtures()

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "nonexistent guest",
      roomTypeFilter: "all",
      roomStateFilter: "all",
      reservationStatusFilter: "all",
    })

    expect(result.rooms).toHaveLength(0)
    expect(result.blocks).toHaveLength(0)
  })

  it("supports large datasets without changing the filter semantics", () => {
    const { rooms, blocks } = makeLargeRoomRackFixtures(600)

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "",
      roomTypeFilter: "all",
      roomStateFilter: "all",
      reservationStatusFilter: "checked_in",
    })

    expect(result.blocks).toHaveLength(100)
    expect(result.rooms).toHaveLength(100)
    expect(result.blocks.every((block) => block.status === "checked_in")).toBe(true)
    expect(result.rooms.every((room) => result.blocks.some((block) => block.room_id === room.id))).toBe(true)
  })

  it.each([
    "readiness:ready",
    "occupancy:vacant",
    "occupancy:occupied",
    "housekeeping:clean",
    "housekeeping:dirty",
    "housekeeping:cleaning",
    "housekeeping:inspecting",
    "housekeeping:inspected",
    "operational:operational",
    "operational:maintenance",
    "operational:out_of_order",
    "operational:blocked",
  ] satisfies RackRoomStateFilter[])("supports the legend filter %s", (roomStateFilter) => {
    const { rooms, blocks } = makeLargeRoomRackFixtures(180)

    const result = applyRoomRackFilters(rooms, blocks, {
      search: "",
      roomTypeFilter: "all",
      roomStateFilter,
      reservationStatusFilter: "all",
    })

    expect(result.rooms.length).toBeGreaterThan(0)
    expect(result.rooms.every((room) => roomMatchesStateFilter(room, roomStateFilter))).toBe(true)
    expect(result.blocks.every((block) => result.rooms.some((room) => room.id === block.room_id))).toBe(true)
  })

  it("exposes the base reservation-status filter helper", () => {
    const { blocks } = makeRoomRackFixtures()

    expect(filterRackBlocks(blocks, "all")).toHaveLength(blocks.length)
    expect(filterRackBlocks(blocks, "no_show").map((block) => block.reservation_room_id)).toEqual(["rr-7"])
  })
})
