import { describe, expect, it } from "vitest"
import { buildRackPricingImpact, calculateRackStayTotal } from "@/lib/room-rack/pricing"
import type { RackBlock, RackRoom } from "@/lib/room-rack/types"

const room: RackRoom = {
  id: "room-2",
  room_number: "202",
  floor: 2,
  status: "available",
  room_type_id: "deluxe",
  room_type_name: "Номер «Делюкс»",
  base_rate: 3900,
}

const block: RackBlock = {
  reservation_room_id: "rr-1",
  reservation_id: "res-1",
  reservation_number: "RES-1",
  room_id: "room-1",
  room_type_id: "standard",
  guest: { id: "guest-1", first_name: "Олена", last_name: "Коваль" },
  check_in: "2026-04-27",
  check_out: "2026-04-29",
  nights: 2,
  status: "confirmed",
  payment_status: "partial",
  total_amount: 4800,
  paid_amount: 1000,
  balance: 3800,
  adults: 2,
  children: 0,
  rate: 2400,
  rate_plan_discount_percentage: 10,
}

describe("room-rack pricing", () => {
  it("calculates discounted stay totals", () => {
    expect(calculateRackStayTotal({ nightlyRate: 3900, nights: 3, discountPercentage: 10 })).toBe(10530)
  })

  it("builds a pricing impact for room type and date changes", () => {
    const impact = buildRackPricingImpact({
      block,
      targetRoom: room,
      newCheckIn: "2026-04-28",
      newCheckOut: "2026-05-01",
    })

    expect(impact.oldTotal).toBe(4800)
    expect(impact.newTotal).toBe(10530)
    expect(impact.delta).toBe(5730)
    expect(impact.newNightlyRate).toBe(3900)
    expect(impact.newNights).toBe(3)
    expect(impact.requiresReview).toBe(true)
  })
})
