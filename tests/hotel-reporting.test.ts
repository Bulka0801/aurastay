import { describe, expect, it } from "vitest"

import {
  calculateDailyOccupancy,
  occupiedNightsInPeriod,
  proratedRoomRevenue,
  reservationOccupiesDate,
  reservationOverlapsPeriod,
} from "@/lib/reports/hotel-reporting"

describe("hotel reporting calculations", () => {
  it("includes reservations that started before the report period", () => {
    const reservation = {
      check_in_date: "2026-06-01",
      check_out_date: "2026-06-10",
    }

    expect(reservationOverlapsPeriod(reservation, "2026-06-05", "2026-06-07")).toBe(true)
    expect(occupiedNightsInPeriod(reservation, "2026-06-05", "2026-06-07")).toBe(3)
  })

  it("treats checkout day as no longer occupied", () => {
    const reservation = {
      check_in_date: "2026-06-05",
      check_out_date: "2026-06-08",
    }

    expect(reservationOccupiesDate(reservation, "2026-06-07")).toBe(true)
    expect(reservationOccupiesDate(reservation, "2026-06-08")).toBe(false)
  })

  it("calculates occupancy from rooms available for sale", () => {
    const result = calculateDailyOccupancy(
      "2026-06-06",
      [
        { id: "101", status: "available" },
        { id: "102", status: "occupied" },
        { id: "103", status: "maintenance" },
      ],
      [
        {
          check_in_date: "2026-06-05",
          check_out_date: "2026-06-08",
          status: "checked_in",
          adults: 2,
          children: 1,
          reservation_rooms: [{ room_id: "102" }],
        },
      ],
    )

    expect(result.roomsForSale).toBe(2)
    expect(result.occupiedRooms).toBe(1)
    expect(result.occupancyRate).toBe(50)
    expect(result.peopleInHouse).toBe(3)
  })

  it("prorates reservation value by nights inside the period", () => {
    expect(
      proratedRoomRevenue(
        {
          check_in_date: "2026-06-01",
          check_out_date: "2026-06-05",
          total_amount: 4000,
        },
        "2026-06-03",
        "2026-06-04",
      ),
    ).toBe(2000)
  })
})
