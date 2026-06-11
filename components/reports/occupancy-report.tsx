"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Room {
  id: string
  status: string
  occupancy_status?: string | null
  housekeeping_status?: string | null
  operational_status?: string | null
}

interface OccupancyReportProps {
  rooms: Room[]
  occupiedRooms: Room[]
}

export function OccupancyReport({ rooms, occupiedRooms }: OccupancyReportProps) {
  const statusCounts = {
    available: rooms.filter(
      (room) =>
        room.occupancy_status === "vacant" &&
        room.operational_status === "operational" &&
        ["clean", "inspected"].includes(room.housekeeping_status ?? ""),
    ).length,
    occupied: rooms.filter((room) =>
      room.occupancy_status
        ? room.occupancy_status === "occupied"
        : occupiedRooms.some((occupiedRoom) => occupiedRoom.id === room.id),
    ).length,
    dirty: rooms.filter((room) => room.housekeeping_status === "dirty").length,
    cleaning: rooms.filter((room) => room.housekeeping_status === "cleaning").length,
    maintenance: rooms.filter((room) => room.operational_status === "maintenance").length,
    out_of_order: rooms.filter((room) => room.operational_status === "out_of_order").length,
  }

  const occupancyRate = rooms.length > 0 ? ((statusCounts.occupied / rooms.length) * 100).toFixed(1) : "0"
  const percent = (count: number) => (rooms.length > 0 ? ((count / rooms.length) * 100).toFixed(0) : "0")

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Розподіл номерів за статусами</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Вільні</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">{statusCounts.available}</Badge>
              <span className="text-sm text-muted-foreground">{percent(statusCounts.available)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Зайняті</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">{statusCounts.occupied}</Badge>
              <span className="text-sm text-muted-foreground">{occupancyRate}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Брудні</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">{statusCounts.dirty}</Badge>
              <span className="text-sm text-muted-foreground">{percent(statusCounts.dirty)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Прибираються</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">{statusCounts.cleaning}</Badge>
              <span className="text-sm text-muted-foreground">{percent(statusCounts.cleaning)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">На ремонті</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800">{statusCounts.maintenance}</Badge>
              <span className="text-sm text-muted-foreground">{percent(statusCounts.maintenance)}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Несправні</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-800">{statusCounts.out_of_order}</Badge>
              <span className="text-sm text-muted-foreground">{percent(statusCounts.out_of_order)}%</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Підсумок завантаженості</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Усього номерів</p>
            <p className="text-3xl font-bold">{rooms.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Зайняті номери</p>
            <p className="text-3xl font-bold text-blue-600">{statusCounts.occupied}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Рівень завантаженості</p>
            <p className="text-3xl font-bold text-green-600">{occupancyRate}%</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
