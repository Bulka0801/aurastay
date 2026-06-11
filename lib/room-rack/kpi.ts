import type { RackBlock, RackKpi, RackRoom } from "./types"

const SELLABLE_ROOM_STATUSES: Array<RackRoom["status"]> = ["available", "inspected"]

function isSellableRoomStatus(status: RackRoom["status"]) {
  return SELLABLE_ROOM_STATUSES.includes(status)
}

function isSellableRoom(room: RackRoom) {
  if (room.occupancy_status && room.operational_status) {
    return room.occupancy_status === "vacant" && room.operational_status === "operational"
  }

  return isSellableRoomStatus(room.status)
}

function getOccupiedRoomIds(rooms: RackRoom[], blocks: RackBlock[], todayIso: string) {
  const occupied = new Set<string>()

  for (const room of rooms) {
    if (room.occupancy_status ? room.occupancy_status === "occupied" : room.status === "occupied") {
      occupied.add(room.id)
    }
  }

  for (const block of blocks) {
    if (!block.room_id) continue
    if (block.status !== "checked_in") continue
    if (block.check_in > todayIso || block.check_out <= todayIso) continue
    occupied.add(block.room_id)
  }

  return occupied
}

export function calculateRoomRackKpi(rooms: RackRoom[], blocks: RackBlock[], todayIso: string): RackKpi {
  const occupiedRoomIds = getOccupiedRoomIds(rooms, blocks, todayIso)
  const sellableFreeRooms = rooms.filter(
    (room) => isSellableRoom(room) && !occupiedRoomIds.has(room.id),
  ).length
  const occupiedRooms = occupiedRoomIds.size
  const sellableInventory = occupiedRooms + sellableFreeRooms
  const inHouseBlocks = blocks.filter(
    (block) => block.status === "checked_in" && block.check_in <= todayIso && block.check_out > todayIso,
  )

  return {
    totalRooms: rooms.length,
    occupiedRooms,
    freeRooms: sellableFreeRooms,
    occupancyRate: sellableInventory === 0 ? 0 : Math.round((occupiedRooms / sellableInventory) * 100),
    arrivalsToday: blocks.filter((block) => block.check_in === todayIso && block.status === "confirmed").length,
    departuresToday: blocks.filter((block) => block.check_out === todayIso && block.status === "checked_in").length,
    inHouse: inHouseBlocks.length,
    pendingConfirm: blocks.filter((block) => block.status === "pending").length,
  }
}
