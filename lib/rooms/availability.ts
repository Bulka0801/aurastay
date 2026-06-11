import type {
  ReservationStatus,
  RoomHousekeepingStatus,
  RoomOccupancyStatus,
  RoomOperationalStatus,
  RoomStatus,
} from "@/lib/types"

export const ROOM_STATUSES_BLOCKING_SALES = ["maintenance", "out_of_order", "blocked"] as const
export const ROOM_STATUSES_READY_FOR_CHECK_IN = ["available", "inspected"] as const
export const ROOM_STATUSES_ALLOWED_WITH_CHECK_IN_OVERRIDE = ["dirty", "cleaning", "inspecting", "occupied"] as const
export const RESERVATION_STATUSES_BLOCKING_INVENTORY = ["pending", "confirmed", "checked_in"] as const
export const RESERVATION_STATUSES_NOT_BLOCKING_INVENTORY = ["cancelled", "no_show", "checked_out"] as const

type BlockingReservationStatus = (typeof RESERVATION_STATUSES_BLOCKING_INVENTORY)[number]

export type RoomStateFilter =
  | "all"
  | "readiness:ready"
  | `occupancy:${RoomOccupancyStatus}`
  | `housekeeping:${RoomHousekeepingStatus}`
  | `operational:${RoomOperationalStatus}`

const salesBlockingStatuses = new Set<string>(ROOM_STATUSES_BLOCKING_SALES)
const readyForCheckInStatuses = new Set<string>(ROOM_STATUSES_READY_FOR_CHECK_IN)
const checkInOverrideStatuses = new Set<string>(ROOM_STATUSES_ALLOWED_WITH_CHECK_IN_OVERRIDE)
const inventoryBlockingReservationStatuses = new Set<string>(RESERVATION_STATUSES_BLOCKING_INVENTORY)

export function isRoomSellableForReservation(status?: string | null) {
  if (!status) return false
  return !salesBlockingStatuses.has(status)
}

export function isRoomReadyForCheckIn(status?: string | null) {
  if (!status) return false
  return readyForCheckInStatuses.has(status)
}

export function isRoomStateReadyForCheckIn(room: {
  occupancy_status?: RoomOccupancyStatus | null
  housekeeping_status?: RoomHousekeepingStatus | null
  operational_status?: RoomOperationalStatus | null
  status?: string | null
}) {
  if (
    room.occupancy_status &&
    room.housekeeping_status &&
    room.operational_status
  ) {
    return (
      room.occupancy_status === "vacant" &&
      (room.housekeeping_status === "clean" ||
        room.housekeeping_status === "inspected") &&
      room.operational_status === "operational"
    )
  }

  return isRoomReadyForCheckIn(room.status)
}

export function isRoomStateSellable(room: {
  occupancy_status?: RoomOccupancyStatus | null
  operational_status?: RoomOperationalStatus | null
  status?: string | null
}) {
  if (room.occupancy_status && room.operational_status) {
    return (
      room.occupancy_status === "vacant" &&
      room.operational_status === "operational"
    )
  }

  return isRoomSellableForReservation(room.status)
}

export function getRoomLegacyStatus(room: {
  occupancy_status?: RoomOccupancyStatus | null
  housekeeping_status?: RoomHousekeepingStatus | null
  operational_status?: RoomOperationalStatus | null
  status?: string | null
}) {
  if (!room.occupancy_status || !room.housekeeping_status || !room.operational_status) {
    return room.status ?? "available"
  }
  if (room.operational_status !== "operational") return room.operational_status
  if (room.occupancy_status === "occupied") return "occupied"
  if (room.housekeeping_status !== "clean") return room.housekeeping_status
  return "available"
}

export function roomMatchesStateFilter(
  room: {
    occupancy_status?: RoomOccupancyStatus | null
    housekeeping_status?: RoomHousekeepingStatus | null
    operational_status?: RoomOperationalStatus | null
  },
  filter: RoomStateFilter,
) {
  if (filter === "all") return true
  if (filter === "readiness:ready") return isRoomStateReadyForCheckIn(room)

  const [dimension, value] = filter.split(":")

  if (dimension === "occupancy") return room.occupancy_status === value
  if (dimension === "housekeeping") return room.housekeeping_status === value
  if (dimension === "operational") return room.operational_status === value

  return false
}

export function isRoomAllowedWithCheckInOverride(status?: string | null) {
  if (!status) return false
  return checkInOverrideStatuses.has(status)
}

export function isRoomNeverAllowedForCheckIn(status?: string | null) {
  if (!status) return true
  return salesBlockingStatuses.has(status)
}

export function getBlockingReservationStatuses(): BlockingReservationStatus[] {
  return [...RESERVATION_STATUSES_BLOCKING_INVENTORY]
}

export function doesReservationStatusBlockInventory(status?: string | null) {
  if (!status) return false
  return inventoryBlockingReservationStatuses.has(status)
}

export function doDateRangesOverlap(leftCheckIn: string, leftCheckOut: string, rightCheckIn: string, rightCheckOut: string) {
  return leftCheckIn < rightCheckOut && leftCheckOut > rightCheckIn
}

export function getRoomOperationalAvailability(status?: RoomStatus | string | null) {
  if (isRoomReadyForCheckIn(status)) return "ready"
  if (isRoomAllowedWithCheckInOverride(status)) return "override"
  if (isRoomSellableForReservation(status)) return "sellable_only"
  return "blocked"
}

export function getRoomAvailabilityReason(status?: string | null) {
  switch (status) {
    case "maintenance":
      return "Номер у ремонті."
    case "out_of_order":
      return "Номер не в експлуатації."
    case "blocked":
      return "Номер заблокований для продажу."
    case "dirty":
      return "Номер можна бронювати, але для заселення потрібне housekeeping override."
    case "cleaning":
      return "Номер прибирається: бронювати можна, заселення тільки через override."
    case "inspecting":
      return "Номер на перевірці: бронювати можна, заселення тільки через override."
    case "occupied":
      return "Номер зайнятий зараз: бронювати можна тільки без перетину з активними бронями."
    case "available":
    case "inspected":
      return "Номер готовий."
    default:
      return status ? `Невідомий статус номера: ${status}.` : "Статус номера не вказаний."
  }
}

export function getRoomStateAvailabilityReason(room: {
  occupancy_status?: RoomOccupancyStatus | null
  housekeeping_status?: RoomHousekeepingStatus | null
  operational_status?: RoomOperationalStatus | null
  status?: string | null
}) {
  if (!room.occupancy_status || !room.housekeeping_status || !room.operational_status) {
    return getRoomAvailabilityReason(room.status)
  }
  if (room.operational_status === "maintenance") return "Номер на техобслуговуванні."
  if (room.operational_status === "out_of_order") return "Номер не в експлуатації."
  if (room.operational_status === "blocked") return "Номер тимчасово недоступний."
  if (room.occupancy_status === "occupied") {
    return "Номер зайнятий зараз; доступність визначається відсутністю перетину бронювань."
  }
  if (room.housekeeping_status === "dirty") return "Номер вільний, але потребує прибирання."
  if (room.housekeeping_status === "cleaning") return "Номер зараз прибирається."
  if (room.housekeeping_status === "inspecting") return "Номер очікує перевірки."
  return "Номер готовий."
}
