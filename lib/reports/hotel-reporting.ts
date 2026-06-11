import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns"

export const NON_SELLABLE_ROOM_STATUSES = new Set(["maintenance", "out_of_order", "blocked"])
export const TERMINAL_RESERVATION_STATUSES = new Set(["cancelled", "no_show"])

export type ReportingReservation = {
  check_in_date: string
  check_out_date: string
  status: string
  adults?: number | null
  children?: number | null
  total_amount?: number | string | null
  reservation_rooms?: Array<{ room_id?: string | null }> | null
}

export type ReportingRoom = {
  id: string
  status?: string | null
  operational_status?: string | null
}

function dateOnly(value: string) {
  return parseISO(value.slice(0, 10))
}

export function reservationOverlapsPeriod(
  reservation: Pick<ReportingReservation, "check_in_date" | "check_out_date">,
  fromDate: string,
  toDate: string,
) {
  return reservation.check_in_date <= toDate && reservation.check_out_date > fromDate
}

export function reservationOccupiesDate(
  reservation: Pick<ReportingReservation, "check_in_date" | "check_out_date">,
  date: string,
) {
  return reservation.check_in_date <= date && reservation.check_out_date > date
}

export function occupiedNightsInPeriod(
  reservation: Pick<ReportingReservation, "check_in_date" | "check_out_date">,
  fromDate: string,
  toDate: string,
) {
  if (!reservationOverlapsPeriod(reservation, fromDate, toDate)) return 0

  const stayStart = reservation.check_in_date > fromDate ? reservation.check_in_date : fromDate
  const periodEndExclusive = format(addDays(dateOnly(toDate), 1), "yyyy-MM-dd")
  const stayEnd = reservation.check_out_date < periodEndExclusive ? reservation.check_out_date : periodEndExclusive

  return Math.max(0, differenceInCalendarDays(dateOnly(stayEnd), dateOnly(stayStart)))
}

export function reservationRoomCount(reservation: ReportingReservation) {
  const assignedRooms = new Set(
    (reservation.reservation_rooms ?? [])
      .map((room) => room.room_id)
      .filter((roomId): roomId is string => Boolean(roomId)),
  )

  return Math.max(1, assignedRooms.size)
}

export function reservationPeopleCount(reservation: ReportingReservation) {
  return Math.max(0, Number(reservation.adults ?? 0) + Number(reservation.children ?? 0))
}

export function calculateDailyOccupancy(
  date: string,
  rooms: ReportingRoom[],
  reservations: ReportingReservation[],
) {
  const liveReservations = reservations.filter(
    (reservation) =>
      !TERMINAL_RESERVATION_STATUSES.has(reservation.status) && reservationOccupiesDate(reservation, date),
  )
  const occupiedRooms = liveReservations.reduce(
    (sum, reservation) => sum + reservationRoomCount(reservation),
    0,
  )
  const roomsOutOfService = rooms.filter((room) =>
    room.operational_status
      ? room.operational_status !== "operational"
      : NON_SELLABLE_ROOM_STATUSES.has(room.status ?? ""),
  ).length
  const roomsForSale = Math.max(0, rooms.length - roomsOutOfService)

  return {
    occupiedRooms,
    roomsOutOfService,
    roomsForSale,
    occupancyRate: roomsForSale > 0 ? Math.min(100, (occupiedRooms / roomsForSale) * 100) : 0,
    peopleInHouse: liveReservations.reduce(
      (sum, reservation) => sum + reservationPeopleCount(reservation),
      0,
    ),
  }
}

export function proratedRoomRevenue(
  reservation: Pick<ReportingReservation, "check_in_date" | "check_out_date" | "total_amount">,
  fromDate: string,
  toDate: string,
) {
  const totalNights = Math.max(
    1,
    differenceInCalendarDays(dateOnly(reservation.check_out_date), dateOnly(reservation.check_in_date)),
  )
  const nightsInPeriod = occupiedNightsInPeriod(reservation, fromDate, toDate)
  const totalAmount = Number(reservation.total_amount ?? 0)

  return Number.isFinite(totalAmount) ? (totalAmount / totalNights) * nightsInPeriod : 0
}
