"use client"

import { Card, CardContent } from "@/components/ui/card"
import { BedDouble, Brush, CheckCircle2, Wrench } from "lucide-react"
import { RoomMap } from "./room-map"
import type { HKTask, Room } from "./types"

interface Props {
  rooms: Room[]
  tasks: HKTask[]
}

export function FrontDeskReadiness({ rooms, tasks }: Props) {
  const counts = {
    available: rooms.filter((r) => r.status === "available").length,
    dirty: rooms.filter((r) => r.status === "dirty").length,
    cleaning: rooms.filter((r) => r.status === "cleaning").length,
    inspected: rooms.filter((r) => r.status === "inspected").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
  }

  const items = [
    { label: "Готові до заселення", value: counts.available, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Перевірено", value: counts.inspected, icon: BedDouble, color: "text-teal-600" },
    { label: "Прибираються", value: counts.cleaning, icon: Brush, color: "text-amber-600" },
    { label: "Очікує прибирання", value: counts.dirty, icon: Brush, color: "text-rose-600" },
    { label: "На обслуговуванні", value: counts.maintenance, icon: Wrench, color: "text-slate-600" },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it) => (
          <Card key={it.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <it.icon className={`h-7 w-7 ${it.color}`} />
              <div>
                <p className="text-2xl font-bold leading-none">{it.value}</p>
                <p className="text-[11px] text-muted-foreground">{it.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RoomMap rooms={rooms} tasks={tasks} canEdit={false} updatingRoomId={null} />
    </div>
  )
}
