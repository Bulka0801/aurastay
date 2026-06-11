import type { RackBlock, RackRoom } from "./types"
import {
  roomMatchesStateFilter,
  type RoomStateFilter,
} from "@/lib/rooms/availability"

export type RackRoomStateFilter = RoomStateFilter
export type RackReservationStatusFilter = RackBlock["status"] | "all"

export interface RoomRackFilters {
  search: string
  roomTypeFilter: string
  roomStateFilter: RackRoomStateFilter
  reservationStatusFilter: RackReservationStatusFilter
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

function groupBlocksByRoom(blocks: RackBlock[]) {
  const grouped = new Map<string, RackBlock[]>()

  for (const block of blocks) {
    if (!block.room_id) continue
    const current = grouped.get(block.room_id) ?? []
    current.push(block)
    grouped.set(block.room_id, current)
  }

  return grouped
}

export function filterRackBlocks(blocks: RackBlock[], reservationStatusFilter: RackReservationStatusFilter) {
  if (reservationStatusFilter === "all") return blocks
  return blocks.filter((block) => block.status === reservationStatusFilter)
}

export function applyRoomRackFilters(rooms: RackRoom[], blocks: RackBlock[], filters: RoomRackFilters) {
  const search = normalizeSearch(filters.search)
  const reservationFilteredBlocks = filterRackBlocks(blocks, filters.reservationStatusFilter)
  const blocksByRoom = groupBlocksByRoom(reservationFilteredBlocks)

  const visibleRooms = rooms.filter((room) => {
    if (filters.roomTypeFilter !== "all" && room.room_type_id !== filters.roomTypeFilter) return false
    if (!roomMatchesStateFilter(room, filters.roomStateFilter)) return false
    if (filters.reservationStatusFilter !== "all" && !blocksByRoom.has(room.id)) return false
    if (!search) return true

    if (room.room_number.toLowerCase().includes(search)) return true
    if (room.room_type_name.toLowerCase().includes(search)) return true

    const roomBlocks = blocksByRoom.get(room.id) ?? []
    return roomBlocks.some((block) => {
      const guestName = `${block.guest.first_name} ${block.guest.last_name}`.toLowerCase()
      return guestName.includes(search) || block.reservation_number.toLowerCase().includes(search)
    })
  })

  const visibleRoomIds = new Set(visibleRooms.map((room) => room.id))
  const visibleBlocks = reservationFilteredBlocks.filter(
    (block) => block.room_id !== null && visibleRoomIds.has(block.room_id),
  )

  return { rooms: visibleRooms, blocks: visibleBlocks }
}
