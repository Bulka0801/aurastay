import { nightsBetween } from "./date-utils"
import type { RackBlock, RackPricingImpact, RackRoom } from "./types"

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getRoomNightlyRate(room: RackRoom | undefined, fallbackRate: number) {
  return Number(room?.base_rate ?? fallbackRate ?? 0)
}

export function calculateRackStayTotal({
  nightlyRate,
  nights,
  discountPercentage,
}: {
  nightlyRate: number
  nights: number
  discountPercentage?: number | null
}) {
  const baseAmount = Math.max(0, nightlyRate) * Math.max(1, nights)
  const discount = baseAmount * (Math.max(0, Number(discountPercentage ?? 0)) / 100)
  return roundMoney(baseAmount - discount)
}

export function buildRackPricingImpact({
  block,
  targetRoom,
  newCheckIn,
  newCheckOut,
}: {
  block: RackBlock
  targetRoom?: RackRoom
  newCheckIn: string
  newCheckOut: string
}): RackPricingImpact {
  const oldNights = Math.max(1, block.nights)
  const newNights = nightsBetween(newCheckIn, newCheckOut)
  const oldNightlyRate = Number(block.rate ?? 0)
  const newNightlyRate = getRoomNightlyRate(targetRoom, oldNightlyRate)
  const discountPercentage = Number(block.rate_plan_discount_percentage ?? 0)
  const oldTotal = roundMoney(Number(block.total_amount ?? 0))
  const newTotal = calculateRackStayTotal({
    nightlyRate: newNightlyRate,
    nights: newNights,
    discountPercentage,
  })

  return {
    oldTotal,
    newTotal,
    delta: roundMoney(newTotal - oldTotal),
    oldNightlyRate,
    newNightlyRate,
    oldNights,
    newNights,
    discountPercentage,
    targetRoomTypeId: targetRoom?.room_type_id ?? block.room_type_id,
    targetRoomTypeName: targetRoom?.room_type_name,
    requiresReview:
      newTotal !== oldTotal ||
      newNightlyRate !== oldNightlyRate ||
      newNights !== oldNights ||
      (targetRoom?.room_type_id != null && targetRoom.room_type_id !== block.room_type_id),
  }
}
