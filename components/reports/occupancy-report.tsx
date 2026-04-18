"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatRoomStatus } from "@/lib/localization"

interface Room {
  id: string
  status: string
}

interface OccupancyReportProps {
  rooms: Room[]
  occupiedRooms: Room[]
}

export function OccupancyReport({ rooms, occupiedRooms }: OccupancyReportProps) {
  const statusCounts = {
    available: rooms.filter((r) => r.status === "available").length,
    occupied: occupiedRooms.length,
    dirty: rooms.filter((r) => r.status === "dirty").length,
    cleaning: rooms.filter((r) => r.status === "cleaning").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
    out_of_order: rooms.filter((r) => r.status === "out_of_order").length,
  }

  const occupancyRate = rooms.length > 0 ? ((occupiedRooms.length / rooms.length) * 100).toFixed(1) : "0"

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Розподіл статусів номерів</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatRoomStatus("available")}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">{statusCounts.available}</Badge>
              <span className="text-sm text-muted-foreground">
                {((statusCounts.available / rooms.length) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatRoomStatus("occupied")}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">{statusCounts.occupied}</Badge>
              <span className="text-sm text-muted-foreground">{occupancyRate}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatRoomStatus("dirty")}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">{statusCounts.dirty}</Badge>
              <span className="text-sm text-muted-foreground">
                {((statusCounts.dirty / rooms.length) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatRoomStatus("cleaning")}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">{statusCounts.cleaning}</Badge>
              <span className="text-sm text-muted-foreground">
                {((statusCounts.cleaning / rooms.length) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatRoomStatus("maintenance")}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800">{statusCounts.maintenance}</Badge>
              <span className="text-sm text-muted-foreground">
                {((statusCounts.maintenance / rooms.length) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatRoomStatus("out_of_order")}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-800">{statusCounts.out_of_order}</Badge>
              <span className="text-sm text-muted-foreground">
                {((statusCounts.out_of_order / rooms.length) * 100).toFixed(0)}%
              </span>
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
            <p className="text-sm text-muted-foreground mb-1">Заселені номери</p>
            <p className="text-3xl font-bold text-blue-600">{occupiedRooms.length}</p>
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
