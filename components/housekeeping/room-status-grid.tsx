"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Room {
  id: string
  room_number: string
  floor: number
  status: string
  room_type: {
    name: string
    code: string
  }
  housekeeping_tasks: any[]
}

const statusColors = {
  available: "bg-green-100 text-green-800 border-green-200",
  occupied: "bg-blue-100 text-blue-800 border-blue-200",
  dirty: "bg-red-100 text-red-800 border-red-200",
  cleaning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  maintenance: "bg-orange-100 text-orange-800 border-orange-200",
  out_of_order: "bg-gray-100 text-gray-800 border-gray-200",
}

export function RoomStatusGrid({ rooms }: { rooms: Room[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState("all")
  const [updating, setUpdating] = useState<string | null>(null)

  const filteredRooms = rooms.filter((room) => filter === "all" || room.status === filter)

  // Group rooms by floor
  const roomsByFloor = filteredRooms.reduce(
    (acc, room) => {
      if (!acc[room.floor]) acc[room.floor] = []
      acc[room.floor].push(room)
      return acc
    },
    {} as Record<number, Room[]>,
  )

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    setUpdating(roomId)
    const supabase = createClient()

    try {
      await supabase.from("rooms").update({ status: newStatus }).eq("id", roomId)

      router.refresh()
    } catch (error) {
      console.error("Error updating room status:", error)
    } finally {
      setUpdating(null)
    }
  }

  const statusCounts = {
    available: rooms.filter((r) => r.status === "available").length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    dirty: rooms.filter((r) => r.status === "dirty").length,
    cleaning: rooms.filter((r) => r.status === "cleaning").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
    out_of_order: rooms.filter((r) => r.status === "out_of_order").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All ({rooms.length})
          </Button>
          <Button
            variant={filter === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("available")}
          >
            Available ({statusCounts.available})
          </Button>
          <Button variant={filter === "dirty" ? "default" : "outline"} size="sm" onClick={() => setFilter("dirty")}>
            Dirty ({statusCounts.dirty})
          </Button>
          <Button
            variant={filter === "cleaning" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("cleaning")}
          >
            Cleaning ({statusCounts.cleaning})
          </Button>
          <Button
            variant={filter === "occupied" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("occupied")}
          >
            Occupied ({statusCounts.occupied})
          </Button>
          <Button
            variant={filter === "maintenance" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("maintenance")}
          >
            Maintenance ({statusCounts.maintenance})
          </Button>
        </div>
      </div>

      {Object.entries(roomsByFloor)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([floor, floorRooms]) => (
          <div key={floor} className="space-y-3">
            <h3 className="text-lg font-semibold">Floor {floor}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {floorRooms
                .sort((a, b) => a.room_number.localeCompare(b.room_number))
                .map((room) => (
                  <Card
                    key={room.id}
                    className={`p-4 border-2 ${statusColors[room.status as keyof typeof statusColors]}`}
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
                        value={room.status}
                        onValueChange={(value) => handleStatusChange(room.id, value)}
                        disabled={updating === room.id}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="dirty">Dirty</SelectItem>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="out_of_order">Out of Order</SelectItem>
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
