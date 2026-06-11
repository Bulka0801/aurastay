"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BedDouble, Wrench, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { getRoomLegacyStatus } from "@/lib/rooms/availability"
import type {
  RoomHousekeepingStatus,
  RoomOccupancyStatus,
  RoomOperationalStatus,
} from "@/lib/types"
import { cn } from "@/lib/utils"

interface Room {
  id: string
  room_number: string
  floor: number
  status: string
  occupancy_status?: RoomOccupancyStatus | null
  housekeeping_status?: RoomHousekeepingStatus | null
  operational_status?: RoomOperationalStatus | null
  room_types?: {
    name: string
    code: string
  }
}

interface RoomStatusGridProps {
  rooms: Room[]
  onRoomClick?: (room: Room) => void
}

const statusConfig = {
  available: {
    label: "Вільний",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  occupied: {
    label: "Зайнятий",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: BedDouble,
  },
  dirty: {
    label: "Потребує прибирання",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
  },
  cleaning: {
    label: "Прибирається",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
  },
  inspected: {
    label: "Перевірено",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: CheckCircle2,
  },
  maintenance: {
    label: "На ремонті",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: Wrench,
  },
  out_of_order: {
    label: "Несправний",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: Wrench,
  },
  blocked: {
    label: "Заблокований",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: BedDouble,
  },
  inspecting: {
    label: "На перевірці",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Clock,
  },
}

export function RoomStatusGrid({ rooms, onRoomClick }: RoomStatusGridProps) {
  // Group rooms by floor
  const roomsByFloor = rooms.reduce(
    (acc, room) => {
      if (!acc[room.floor]) {
        acc[room.floor] = []
      }
      acc[room.floor].push(room)
      return acc
    },
    {} as Record<number, Room[]>,
  )

  const floors = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <Card key={floor}>
          <CardHeader>
            <CardTitle className="text-lg">Поверх {floor}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
              {roomsByFloor[floor]
                .sort((a, b) => a.room_number.localeCompare(b.room_number))
                .map((room) => {
                  const roomStatus = getRoomLegacyStatus(room)
                  const status =
                    statusConfig[roomStatus as keyof typeof statusConfig] ||
                    statusConfig.available
                  const Icon = status.icon

                  return (
                    <button
                      key={room.id}
                      onClick={() => onRoomClick?.(room)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all hover:shadow-md",
                        status.color,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-lg font-bold">{room.room_number}</span>
                      <span className="text-xs">{status.label}</span>
                    </button>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
