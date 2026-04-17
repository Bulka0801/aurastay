"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { addDays, formatFullDate, parseISO, toISO } from "@/lib/room-rack/date-utils"
import { CalendarPlus } from "lucide-react"
import type { RackRoom } from "@/lib/room-rack/types"

interface Props {
  context: { roomId: string; date: string }
  rooms: RackRoom[]
  onClose: () => void
}

export function CreateReservationDialog({ context, rooms, onClose }: Props) {
  const router = useRouter()
  const room = rooms.find((r) => r.id === context.roomId)
  const checkIn = context.date
  const checkOut = toISO(addDays(parseISO(context.date), 1))

  const handleContinue = () => {
    const params = new URLSearchParams({
      roomId: context.roomId,
      checkIn,
      checkOut,
    })
    router.push(`/dashboard/reservations/new?${params.toString()}`)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Нове бронювання
          </DialogTitle>
          <DialogDescription>
            Створити бронювання для обраного номера на одну ніч. Деталі можна змінити у формі.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {room && (
            <div className="rounded-md border p-3">
              <div className="text-xs uppercase text-muted-foreground">Номер</div>
              <div className="font-semibold">
                {room.room_number} · {room.room_type_name}
              </div>
              <div className="text-xs text-muted-foreground">пов. {room.floor}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Заїзд</div>
              <div className="font-medium">{formatFullDate(parseISO(checkIn))}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Виїзд</div>
              <div className="font-medium">{formatFullDate(parseISO(checkOut))}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Після натискання «Продовжити» відкриється форма створення бронювання з попередньо заповненими полями.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={handleContinue}>Продовжити</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
