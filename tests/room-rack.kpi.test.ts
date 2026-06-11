import { describe, expect, it } from "vitest"

import { calculateRoomRackKpi } from "@/lib/room-rack/kpi"
import type { RackBlock, RackRoom } from "@/lib/room-rack/types"

function makeRoom(id: string, roomNumber: string, status: RackRoom["status"]): RackRoom {
  return {
    id,
    room_number: roomNumber,
    floor: 1,
    status,
    room_type_id: "standard",
    room_type_name: "Standard",
    room_type_code: "STD",
    base_rate: 2400,
    max_occupancy: 2,
    notes: null,
  }
}

function makeBlock(
  reservationRoomId: string,
  roomId: string | null,
  status: RackBlock["status"],
  checkIn: string,
  checkOut: string,
): RackBlock {
  return {
    reservation_room_id: reservationRoomId,
    reservation_id: `res-${reservationRoomId}`,
    reservation_number: `AUR-${reservationRoomId}`,
    room_id: roomId,
    guest: {
      id: `guest-${reservationRoomId}`,
      first_name: "Test",
      last_name: "Guest",
      email: null,
      phone: null,
      is_vip: false,
    },
    check_in: checkIn,
    check_out: checkOut,
    nights: 2,
    status,
    payment_status: status === "confirmed" || status === "checked_in" ? "paid" : "pending",
    total_amount: 4800,
    paid_amount: status === "confirmed" || status === "checked_in" ? 4800 : 0,
    balance: status === "confirmed" || status === "checked_in" ? 0 : 4800,
    adults: 2,
    children: 0,
    rate: 2400,
    special_requests: null,
  }
}

describe("Room rack KPI calculations", () => {
  it("counts only sellable rooms as free and excludes maintenance-style statuses", () => {
    const rooms = [
      makeRoom("room-1", "101", "available"),
      makeRoom("room-2", "102", "inspected"),
      makeRoom("room-3", "201", "dirty"),
      makeRoom("room-4", "202", "cleaning"),
      makeRoom("room-5", "301", "maintenance"),
      makeRoom("room-6", "302", "blocked"),
      makeRoom("room-7", "401", "out_of_order"),
      makeRoom("room-8", "402", "occupied"),
      makeRoom("room-9", "403", "available"),
    ]

    const blocks = [
      makeBlock("rr-1", "room-9", "checked_in", "2026-05-24", "2026-05-26"),
      makeBlock("rr-2", "room-8", "checked_in", "2026-05-23", "2026-05-26"),
      makeBlock("rr-3", "room-1", "confirmed", "2026-05-24", "2026-05-25"),
    ]

    const kpi = calculateRoomRackKpi(rooms, blocks, "2026-05-24")

    expect(kpi.totalRooms).toBe(9)
    expect(kpi.occupiedRooms).toBe(2)
    expect(kpi.freeRooms).toBe(2)
    expect(kpi.occupancyRate).toBe(50)
    expect(kpi.arrivalsToday).toBe(1)
    expect(kpi.inHouse).toBe(2)
    expect(kpi.pendingConfirm).toBe(0)
  })

  it("keeps KPI global and unaffected by visual filters", () => {
    const rooms = [
      makeRoom("room-1", "101", "available"),
      makeRoom("room-2", "102", "occupied"),
      makeRoom("room-3", "201", "maintenance"),
    ]

    const blocks = [makeBlock("rr-1", "room-2", "checked_in", "2026-05-23", "2026-05-25")]

    const kpi = calculateRoomRackKpi(rooms, blocks, "2026-05-24")

    expect(kpi.totalRooms).toBe(3)
    expect(kpi.occupiedRooms).toBe(1)
    expect(kpi.freeRooms).toBe(1)
    expect(kpi.occupancyRate).toBe(50)
  })
})
