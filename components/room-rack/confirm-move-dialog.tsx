"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react"
import type { PendingChange, RackRoom } from "@/lib/room-rack/types"
import { pluralizeNights } from "@/lib/i18n/uk"
import { formatFullDate, parseISO } from "@/lib/room-rack/date-utils"
import { cn } from "@/lib/utils"

interface Props {
  pending: PendingChange
  rooms: RackRoom[]
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmMoveDialog({ pending, rooms, onConfirm, onCancel }: Props) {
  const { block, type, targetRoomId, newCheckIn, newCheckOut, conflicts } = pending
  const hasConflicts = conflicts.length > 0
  const currentRoom = rooms.find((r) => r.id === block.room_id)
  const targetRoom = rooms.find((r) => r.id === targetRoomId)

  const title =
    type === "move"
      ? "Підтвердити переміщення бронювання"
      : "Підтвердити зміну дат"

  const verb = type === "move" ? "переміщення" : "зміну"

  const nights =
    newCheckIn && newCheckOut
      ? Math.max(
          1,
          Math.round(
            (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : block.nights

  return (
    <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <div>
                Бронювання <span className="font-semibold">№ {block.reservation_number}</span> —{" "}
                <span className="font-medium">
                  {block.guest.first_name} {block.guest.last_name}
                </span>
              </div>

              {type === "move" && currentRoom && targetRoom && (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <span className="font-medium">{currentRoom.room_number}</span>
                  <span className="text-xs text-muted-foreground">({currentRoom.room_type_name})</span>
                  <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{targetRoom.room_number}</span>
                  <span className="text-xs text-muted-foreground">({targetRoom.room_type_name})</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 rounded-md border p-2 text-xs">
                <div>
                  <div className="uppercase text-muted-foreground">Заїзд</div>
                  <div className="font-medium">
                    {newCheckIn ? formatFullDate(parseISO(newCheckIn)) : formatFullDate(parseISO(block.check_in))}
                  </div>
                </div>
                <div>
                  <div className="uppercase text-muted-foreground">Виїзд</div>
                  <div className="font-medium">
                    {newCheckOut ? formatFullDate(parseISO(newCheckOut)) : formatFullDate(parseISO(block.check_out))}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase text-muted-foreground">Тривалість</div>
                  <div className="font-medium">{pluralizeNights(nights)}</div>
                </div>
              </div>

              {currentRoom && targetRoom && currentRoom.room_type_id !== targetRoom.room_type_id && type === "move" && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Перенесення у тип «{targetRoom.room_type_name}» може вимагати перерахунку вартості проживання.
                  </span>
                </div>
              )}

              {hasConflicts && (
                <div className="space-y-2 rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Конфлікт з існуючими бронюваннями ({conflicts.length})
                  </div>
                  <Separator className="bg-rose-200" />
                  <ul className="space-y-1">
                    {conflicts.slice(0, 4).map((c) => (
                      <li key={c.reservation_room_id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          № {c.reservation_number} · {c.guest.first_name} {c.guest.last_name}
                        </span>
                        <span className="tabular-nums">
                          {c.check_in.slice(5)} — {c.check_out.slice(5)}
                        </span>
                      </li>
                    ))}
                    {conflicts.length > 4 && (
                      <li className="text-[11px] italic">і ще {conflicts.length - 4}</li>
                    )}
                  </ul>
                  <p>Спершу перемістіть або змініть ці бронювання.</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={hasConflicts}
            className={cn(hasConflicts && "opacity-50")}
          >
            Підтвердити {verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
