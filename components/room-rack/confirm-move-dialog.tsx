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
import { Spinner } from "@/components/ui/spinner"
import { AlertTriangle, ArrowRight, CalendarClock, ReceiptText } from "lucide-react"
import type { PendingChange, RackRoom } from "@/lib/room-rack/types"
import type { RoomRackErrorMessage } from "@/lib/room-rack/errors"
import { pluralizeNights } from "@/lib/i18n/uk"
import { formatFullDate, parseISO } from "@/lib/room-rack/date-utils"
import { cn } from "@/lib/utils"

interface Props {
  pending: PendingChange
  rooms: RackRoom[]
  confirming?: boolean
  error?: RoomRackErrorMessage | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmMoveDialog({ pending, rooms, confirming = false, error, onConfirm, onCancel }: Props) {
  const { block, type, targetRoomId, newCheckIn, newCheckOut, conflicts, pricing } = pending
  const hasConflicts = conflicts.length > 0
  const currentRoom = rooms.find((r) => r.id === block.room_id)
  const targetRoom = rooms.find((r) => r.id === targetRoomId)

  const title =
    type === "move"
      ? "Підтвердити переміщення бронювання"
      : "Підтвердити зміну дат"

  const verb = type === "move" ? "переміщення" : "зміну"
  const projectedBalance = pricing ? pricing.newTotal - block.paid_amount : block.balance
  const overpaidAmount = projectedBalance < -0.01 ? Math.abs(projectedBalance) : 0

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
                    Перенесення у тип «{targetRoom.room_type_name}» змінить ставку проживання.
                  </span>
                </div>
              )}

              {pricing && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <ReceiptText className="h-4 w-4 text-primary" />
                    Перерахунок вартості проживання
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FinanceCell label="Було" value={fmtMoney(pricing.oldTotal)} />
                    <FinanceCell label="Стане" value={fmtMoney(pricing.newTotal)} strong />
                    <FinanceCell label="Ночей" value={`${pricing.oldNights} → ${pricing.newNights}`} />
                    <FinanceCell
                      label="Ставка/ніч"
                      value={`${fmtMoney(pricing.oldNightlyRate)} → ${fmtMoney(pricing.newNightlyRate)}`}
                    />
                  </div>
                  {pricing.discountPercentage > 0 && (
                    <div className="rounded bg-background/70 px-2 py-1 text-muted-foreground">
                      Застосовано знижку тарифного плану: {pricing.discountPercentage}%
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-md border px-2 py-1.5 font-medium",
                      pricing.delta > 0 && "border-amber-300 bg-amber-50 text-amber-900",
                      pricing.delta < 0 && "border-emerald-300 bg-emerald-50 text-emerald-900",
                      pricing.delta === 0 && "bg-background text-muted-foreground",
                    )}
                  >
                    <span>Різниця</span>
                    <span className="tabular-nums">
                      {pricing.delta > 0 ? "+" : ""}
                      {fmtMoney(pricing.delta)}
                    </span>
                  </div>
                  {overpaidAmount > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-2 text-emerald-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Виникне переплата {fmtMoney(overpaidAmount)}</div>
                        <p className="mt-0.5 text-[11px] leading-4">
                          Повернення коштів не створюється автоматично. Оформіть повернення гостю під час виселення.
                        </p>
                      </div>
                    </div>
                  )}
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

              {error && (
                <div role="alert" className="space-y-1 rounded-md border border-rose-300 bg-rose-50 p-3 text-rose-950">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error.title}
                  </div>
                  <p className="text-xs leading-5">{error.description}</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            disabled={hasConflicts || confirming}
            className={cn(hasConflicts && "opacity-50")}
          >
            {confirming && <Spinner className="mr-2" />}
            {confirming ? "Зберігаємо..." : `Підтвердити ${verb}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FinanceCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border bg-background/70 px-2 py-1.5">
      <div className="uppercase text-muted-foreground">{label}</div>
      <div className={cn("tabular-nums", strong && "font-semibold text-foreground")}>{value}</div>
    </div>
  )
}

function fmtMoney(v: number): string {
  return new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(v)
}
