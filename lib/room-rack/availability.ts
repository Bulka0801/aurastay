import type { RackBlock } from "./types"
import { diffInDays, parseISO } from "./date-utils"

/**
 * Два періоди [aStart, aEnd) та [bStart, bEnd) перетинаються,
 * якщо aStart < bEnd && bStart < aEnd. check_out рахуємо ексклюзивно.
 */
export function periodsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Знаходить бронювання в цьому номері, які конфліктують з цільовим періодом.
 * Ігноруємо сам блок за reservation_room_id, скасовані і no_show.
 */
export function findConflicts(
  blocks: RackBlock[],
  targetRoomId: string,
  newCheckIn: string,
  newCheckOut: string,
  ignoreReservationRoomId?: string,
): RackBlock[] {
  return blocks.filter((b) => {
    if (b.reservation_room_id === ignoreReservationRoomId) return false
    if (b.room_id !== targetRoomId) return false
    if (b.status === "cancelled" || b.status === "no_show") return false
    return periodsOverlap(newCheckIn, newCheckOut, b.check_in, b.check_out)
  })
}

/** Чи цільова дата валідна: check_out > check_in і різниця ≥ 1 ніч */
export function isValidRange(checkIn: string, checkOut: string): boolean {
  return diffInDays(parseISO(checkIn), parseISO(checkOut)) >= 1
}
