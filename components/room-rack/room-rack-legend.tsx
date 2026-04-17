"use client"

import { RESERVATION_STATUS_UK, ROOM_STATUS_UK } from "@/lib/i18n/uk"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { STATUS_BG, STATUS_BORDER } from "./reservation-block"

interface Props {
  onClose: () => void
}

const reservationStatuses: Array<keyof typeof RESERVATION_STATUS_UK> = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
]

const roomStatuses: Array<keyof typeof ROOM_STATUS_UK> = [
  "available",
  "occupied",
  "dirty",
  "cleaning",
  "inspected",
  "maintenance",
  "out_of_order",
  "blocked",
]

export function RoomRackLegend({ onClose }: Props) {
  return (
    <div className="border-b bg-muted/40 px-4 py-3 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Статус бронювання
            </h3>
            <div className="flex flex-wrap gap-2">
              {reservationStatuses.map((s) => (
                <div
                  key={s}
                  className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs ${STATUS_BG[s]} ${STATUS_BORDER[s]}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                  <span className="font-medium">{RESERVATION_STATUS_UK[s]}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Статус номера
            </h3>
            <div className="flex flex-wrap gap-2">
              {roomStatuses.map((s) => (
                <div
                  key={s}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs"
                >
                  <span className={`h-2 w-2 rounded-full ${roomStatusDot(s)}`} />
                  <span>{ROOM_STATUS_UK[s]}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Номери на ремонті / заблоковані виділені штрихуванням у рядку.
            </p>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Закрити легенду">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function roomStatusDot(status: string): string {
  switch (status) {
    case "available":
      return "bg-emerald-500"
    case "occupied":
      return "bg-blue-500"
    case "dirty":
      return "bg-rose-500"
    case "cleaning":
      return "bg-amber-500"
    case "inspected":
      return "bg-indigo-500"
    case "maintenance":
      return "bg-orange-500"
    case "out_of_order":
      return "bg-slate-500"
    case "blocked":
      return "bg-slate-400"
    default:
      return "bg-muted-foreground"
  }
}
