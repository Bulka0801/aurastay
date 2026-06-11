"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { formatRoomHousekeepingStatus } from "@/lib/localization"
import type { RoomHousekeepingStatus } from "@/lib/types"

interface Room {
  id: string
  room_number: string
  floor: number
  status: string
  housekeeping_status: RoomHousekeepingStatus
  room_type: {
    name: string
    code: string
  }
  housekeeping_tasks: any[]
}

const statusColors = {
  clean: "bg-sky-100 text-sky-800 border-sky-200",
  dirty: "bg-red-100 text-red-800 border-red-200",
  cleaning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  inspecting: "bg-violet-100 text-violet-800 border-violet-200",
  inspected: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

export function RoomStatusGrid({ rooms }: { rooms: Room[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState("all")
  const [updating, setUpdating] = useState<string | null>(null)

  const filteredRooms = rooms.filter(
    (room) => filter === "all" || room.housekeeping_status === filter,
  )

  // Group rooms by floor
  const roomsByFloor = filteredRooms.reduce(
    (acc, room) => {
      if (!acc[room.floor]) acc[room.floor] = []
      acc[room.floor].push(room)
      return acc
    },
    {} as Record<number, Room[]>,
  )

  const handleStatusChange = async (roomId: string, newStatus: RoomHousekeepingStatus) => {
    setUpdating(roomId)
    const supabase = createClient()

    try {
      await supabase
        .from("rooms")
        .update({ housekeeping_status: newStatus })
        .eq("id", roomId)

      router.refresh()
    } catch (error) {
      console.error("Error updating room status:", error)
    } finally {
      setUpdating(null)
    }
  }

  const statusCounts = {
    clean: rooms.filter((r) => r.housekeeping_status === "clean").length,
    dirty: rooms.filter((r) => r.housekeeping_status === "dirty").length,
    cleaning: rooms.filter((r) => r.housekeeping_status === "cleaning").length,
    inspecting: rooms.filter((r) => r.housekeeping_status === "inspecting").length,
    inspected: rooms.filter((r) => r.housekeeping_status === "inspected").length,
  }

  const filterLabels: Record<string, string> = {
    all: "Усі",
    clean: "Чисті",
    dirty: "Брудні",
    cleaning: "Прибираються",
    inspecting: "На перевірці",
    inspected: "Перевірені",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            {filterLabels.all} ({rooms.length})
          </Button>
          <Button
            variant={filter === "clean" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("clean")}
          >
            {filterLabels.clean} ({statusCounts.clean})
          </Button>
          <Button variant={filter === "dirty" ? "default" : "outline"} size="sm" onClick={() => setFilter("dirty")}>
            {filterLabels.dirty} ({statusCounts.dirty})
          </Button>
          <Button
            variant={filter === "cleaning" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("cleaning")}
          >
            {filterLabels.cleaning} ({statusCounts.cleaning})
          </Button>
          <Button variant={filter === "inspecting" ? "default" : "outline"} size="sm" onClick={() => setFilter("inspecting")}>
            {filterLabels.inspecting} ({statusCounts.inspecting})
          </Button>
        </div>
      </div>

      {Object.entries(roomsByFloor)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([floor, floorRooms]) => (
          <div key={floor} className="space-y-3">
            <h3 className="text-lg font-semibold">Поверх {floor}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {floorRooms
                .sort((a, b) => a.room_number.localeCompare(b.room_number))
                .map((room) => (
                  <Card
                    key={room.id}
                    className={`p-4 border-2 ${statusColors[room.housekeeping_status]}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">{room.room_number}</span>
                        {room.housekeeping_tasks.filter((t) => t.status !== "completed").length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {room.housekeeping_tasks.filter((t) => t.status !== "completed").length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{room.room_type.name}</p>
                      <Select
                        value={room.housekeeping_status}
                        onValueChange={(value) =>
                          handleStatusChange(room.id, value as RoomHousekeepingStatus)
                        }
                        disabled={updating === room.id}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["clean", "dirty", "cleaning", "inspecting", "inspected"] as const).map(
                            (status) => (
                              <SelectItem key={status} value={status}>
                                {formatRoomHousekeepingStatus(status)}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
    </div>
  )
}
