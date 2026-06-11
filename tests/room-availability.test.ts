import { describe, expect, it } from "vitest"

import {
  doesReservationStatusBlockInventory,
  doDateRangesOverlap,
  getBlockingReservationStatuses,
  getRoomOperationalAvailability,
  isRoomAllowedWithCheckInOverride,
  isRoomReadyForCheckIn,
  isRoomSellableForReservation,
} from "@/lib/rooms/availability"

describe("room availability business rules", () => {
  it("allows selling operational rooms but blocks rooms removed from sale", () => {
    expect(isRoomSellableForReservation("available")).toBe(true)
    expect(isRoomSellableForReservation("inspected")).toBe(true)
    expect(isRoomSellableForReservation("dirty")).toBe(true)
    expect(isRoomSellableForReservation("cleaning")).toBe(true)
    expect(isRoomSellableForReservation("inspecting")).toBe(true)
    expect(isRoomSellableForReservation("occupied")).toBe(true)

    expect(isRoomSellableForReservation("maintenance")).toBe(false)
    expect(isRoomSellableForReservation("out_of_order")).toBe(false)
    expect(isRoomSellableForReservation("blocked")).toBe(false)
  })

  it("separates ready check-in statuses from override statuses", () => {
    expect(isRoomReadyForCheckIn("available")).toBe(true)
    expect(isRoomReadyForCheckIn("inspected")).toBe(true)
    expect(isRoomReadyForCheckIn("dirty")).toBe(false)

    expect(isRoomAllowedWithCheckInOverride("dirty")).toBe(true)
    expect(isRoomAllowedWithCheckInOverride("cleaning")).toBe(true)
    expect(isRoomAllowedWithCheckInOverride("inspecting")).toBe(true)
    expect(isRoomAllowedWithCheckInOverride("occupied")).toBe(true)
    expect(isRoomAllowedWithCheckInOverride("maintenance")).toBe(false)
  })

  it("uses only active reservation statuses as inventory blockers", () => {
    expect(getBlockingReservationStatuses()).toEqual(["pending", "confirmed", "checked_in"])
    expect(doesReservationStatusBlockInventory("pending")).toBe(true)
    expect(doesReservationStatusBlockInventory("confirmed")).toBe(true)
    expect(doesReservationStatusBlockInventory("checked_in")).toBe(true)

    expect(doesReservationStatusBlockInventory("cancelled")).toBe(false)
    expect(doesReservationStatusBlockInventory("no_show")).toBe(false)
    expect(doesReservationStatusBlockInventory("checked_out")).toBe(false)
  })

  it("treats checkout date as non-inclusive for conflict checks", () => {
    expect(doDateRangesOverlap("2026-05-20", "2026-05-24", "2026-05-24", "2026-05-27")).toBe(false)
    expect(doDateRangesOverlap("2026-05-20", "2026-05-24", "2026-05-23", "2026-05-27")).toBe(true)
  })

  it("returns an operational bucket for UI messaging", () => {
    expect(getRoomOperationalAvailability("available")).toBe("ready")
    expect(getRoomOperationalAvailability("dirty")).toBe("override")
    expect(getRoomOperationalAvailability("maintenance")).toBe("blocked")
  })
})
