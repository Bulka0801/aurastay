"use client"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatRoomStatus } from "@/lib/localization"
import type { HKTask, Room } from "./types"

interface Props {
  rooms: Room[]
  tasks: HKTask[]
  canEdit: boolean
  updatingRoomId: string | null
  onStatusChange?: (roomId: string, status: string) => void
  onSelectRoom?: (room: Room) => void
}

const statusTone: Record<string, string> = {
  available: "bg-emerald-50 border-emerald-300 text-emerald-800",
  occupied: "bg-sky-50 border-sky-300 text-sky-800",
  dirty: "bg-rose-50 border-rose-400 text-rose-800",
  cleaning: "bg-amber-50 border-amber-400 text-amber-800",
  inspected: "bg-teal-50 border-teal-300 text-teal-800",
  maintenance: "bg-slate-100 border-slate-400 text-slate-800",
  blocked: "bg-zinc-100 border-zinc-400 text-zinc-700",
}

export function RoomMap({ rooms, tasks, canEdit, updatingRoomId, onStatusChange, onSelectRoom }: Props) {
  const grouped = rooms.reduce<Record<number, Room[]>>((acc, r) => {
    if (!acc[r.floor]) acc[r.floor] = []
    acc[r.floor].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([floor, floorRooms]) => (
          <div key={floor}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Поверх {floor}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {floorRooms
                .sort((a, b) => a.room_number.localeCompare(b.room_number))
                .map((room) => {
                  const tone = statusTone[room.status] ?? statusTone.available
                  const activeTasks = tasks.filter((t) => t.room_id === room.id && t.status !== "completed")
                  const interactive = !!onSelectRoom
                  return (
                    <div
                      key={room.id}
                      className={`relative rounded-lg border-2 p-2.5 transition-all ${tone} ${
                        interactive ? "cursor-pointer hover:scale-[1.02] hover:shadow-md" : ""
                      }`}
                      onClick={() => onSelectRoom?.(room)}
                      role={interactive ? "button" : undefined}
                      tabIndex={interactive ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (interactive && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault()
                          onSelectRoom?.(room)
                        }
                      }}
                    >
                      {activeTasks.length > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {activeTasks.length}
                        </span>
                      )}
                      <p className="text-base font-bold leading-none">{room.room_number}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {room.room_type?.name ?? ""}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-1.5 w-full justify-center border-current py-0 text-[10px]"
                      >
                        {formatRoomStatus(room.status)}
                      </Badge>
                      {canEdit && onStatusChange ? (
                        <Select
                          value={room.status}
                          onValueChange={(v) => onStatusChange(room.id, v)}
                          disabled={updatingRoomId === room.id}
                        >
                          <SelectTrigger
                            className="mt-1.5 h-6 px-1.5 text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">{formatRoomStatus("available")}</SelectItem>
                            <SelectItem value="dirty">{formatRoomStatus("dirty")}</SelectItem>
                            <SelectItem value="cleaning">{formatRoomStatus("cleaning")}</SelectItem>
                            <SelectItem value="inspected">{formatRoomStatus("inspected")}</SelectItem>
                            <SelectItem value="occupied">{formatRoomStatus("occupied")}</SelectItem>
                            <SelectItem value="maintenance">{formatRoomStatus("maintenance")}</SelectItem>
                            <SelectItem value="blocked">{formatRoomStatus("blocked")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : null}
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
    </div>
  )
}
