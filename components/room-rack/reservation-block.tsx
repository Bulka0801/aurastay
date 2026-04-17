"use client"

import { useDraggable } from "@dnd-kit/core"
import { useCallback, useRef, useState } from "react"
import type { ReservationStatus } from "@/lib/types"
import { RESERVATION_STATUS_SHORT_UK } from "@/lib/i18n/uk"
import type { RackBlock } from "@/lib/room-rack/types"
import { cn } from "@/lib/utils"
import { CheckCircle2, CreditCard, Crown, Users } from "lucide-react"

export const STATUS_BG: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-amber-900",
  confirmed: "bg-sky-50 text-sky-900",
  checked_in: "bg-emerald-50 text-emerald-900",
  checked_out: "bg-slate-100 text-slate-700",
  cancelled: "bg-rose-50 text-rose-900",
  no_show: "bg-orange-50 text-orange-900",
}

export const STATUS_BORDER: Record<ReservationStatus, string> = {
  pending: "border-amber-300",
  confirmed: "border-sky-300",
  checked_in: "border-emerald-400",
  checked_out: "border-slate-300",
  cancelled: "border-rose-300",
  no_show: "border-orange-300",
}

const STATUS_ACCENT: Record<ReservationStatus, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-sky-500",
  checked_in: "bg-emerald-500",
  checked_out: "bg-slate-400",
  cancelled: "bg-rose-500",
  no_show: "bg-orange-500",
}

interface Props {
  block: RackBlock
  left: number
  width: number
  cellWidth: number
  onClick: (id: string) => void
  onResize: (block: RackBlock, side: "start" | "end", newIsoDate: string) => void
  gridStartIso: string
  gridEndIso: string
  isSelected: boolean
  compact: boolean
  isDragging?: boolean
}

export function ReservationBlock({
  block,
  left,
  width,
  cellWidth,
  onClick,
  onResize,
  gridStartIso,
  gridEndIso,
  isSelected,
  compact,
  isDragging,
}: Props) {
  const [resizing, setResizing] = useState<"start" | "end" | null>(null)
  const [resizePreviewPx, setResizePreviewPx] = useState<number>(0)
  const rafRef = useRef<number | null>(null)

  const { attributes, listeners, setNodeRef, isDragging: dndDragging, transform } = useDraggable({
    id: `block:${block.reservation_room_id}`,
    data: { blockId: block.reservation_room_id },
    disabled: block.status === "checked_out" || block.status === "cancelled" || block.status === "no_show" || resizing !== null,
  })

  const reservationStatus = block.status as ReservationStatus
  const bgCls = STATUS_BG[reservationStatus] ?? "bg-slate-50"
  const borderCls = STATUS_BORDER[reservationStatus] ?? "border-slate-300"
  const accent = STATUS_ACCENT[reservationStatus] ?? "bg-slate-400"

  const startResize = useCallback(
    (side: "start" | "end") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation()
      e.preventDefault()
      setResizing(side)
      setResizePreviewPx(0)
      const startX = e.clientX
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => setResizePreviewPx(dx))
      }
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId)
        target.removeEventListener("pointermove", onMove)
        target.removeEventListener("pointerup", onUp)
        target.removeEventListener("pointercancel", onUp)
        const dx = ev.clientX - startX
        const deltaDays = Math.round(dx / cellWidth)
        setResizing(null)
        setResizePreviewPx(0)
        if (deltaDays === 0) return
        const shiftIso = (iso: string, days: number) => {
          const [y, m, d] = iso.split("-").map(Number)
          const dt = new Date(y, m - 1, d + days)
          const yy = dt.getFullYear()
          const mm = String(dt.getMonth() + 1).padStart(2, "0")
          const dd = String(dt.getDate()).padStart(2, "0")
          return `${yy}-${mm}-${dd}`
        }
        if (side === "start") {
          onResize(block, "start", shiftIso(block.check_in, deltaDays))
        } else {
          onResize(block, "end", shiftIso(block.check_out, deltaDays))
        }
      }
      target.addEventListener("pointermove", onMove)
      target.addEventListener("pointerup", onUp)
      target.addEventListener("pointercancel", onUp)
    },
    [block, cellWidth, onResize],
  )

  // розрахунок прев’ю resize
  const leftWithPreview = left + (resizing === "start" ? resizePreviewPx : 0)
  const widthWithPreview =
    width + (resizing === "start" ? -resizePreviewPx : resizing === "end" ? resizePreviewPx : 0)

  const translateStyle: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 60 }
    : undefined

  const guestName = `${block.guest.first_name} ${block.guest.last_name}`.trim()
  const hasBalance = block.balance > 0.01

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(resizing ? {} : listeners)}
      role="button"
      tabIndex={0}
      aria-label={`Бронювання ${block.reservation_number} — ${guestName}`}
      onClick={(e) => {
        e.stopPropagation()
        if (!dndDragging && !resizing) onClick(block.reservation_room_id)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick(block.reservation_room_id)
        }
      }}
      className={cn(
        "group absolute top-1.5 bottom-1.5 cursor-grab select-none overflow-hidden rounded-md border text-xs shadow-sm transition-all",
        bgCls,
        borderCls,
        isSelected && "ring-2 ring-primary ring-offset-1",
        (dndDragging || isDragging) && "opacity-50",
        resizing && "ring-2 ring-accent",
      )}
      style={{
        left: `${Math.max(0, leftWithPreview)}px`,
        width: `${Math.max(24, widthWithPreview)}px`,
        ...translateStyle,
      }}
    >
      {/* ліва акцентна смуга за статусом */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", accent)} />

      {/* resize handles — не затуляють весь блок, а лише країв по 6px */}
      {block.check_in >= gridStartIso && (
        <div
          role="separator"
          aria-label="Змінити дату заїзду"
          onPointerDown={startResize("start")}
          className="absolute left-1 top-0 bottom-0 z-10 w-1.5 cursor-ew-resize opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-70"
          style={{ background: "currentColor" }}
        />
      )}
      {block.check_out <= gridEndIso && (
        <div
          role="separator"
          aria-label="Змінити дату виїзду"
          onPointerDown={startResize("end")}
          className="absolute right-0 top-0 bottom-0 z-10 w-1.5 cursor-ew-resize opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-70"
          style={{ background: "currentColor" }}
        />
      )}

      {/* контент */}
      <div className={cn("flex h-full flex-col gap-0.5 px-2 py-1 pl-3", compact && "py-0.5")}>
        <div className="flex items-center gap-1 truncate text-[11px] font-semibold leading-tight">
          {block.guest.is_vip && <Crown className="h-3 w-3 shrink-0 text-amber-500" aria-label="VIP гість" />}
          <span className="truncate">{guestName || "—"}</span>
        </div>
        {!compact && (
          <div className="flex items-center gap-2 truncate text-[10px] opacity-80">
            <span className="tabular-nums">№ {block.reservation_number}</span>
            {(block.adults > 0 || block.children > 0) && (
              <span className="inline-flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" />
                {block.adults + block.children}
              </span>
            )}
            <span className="tabular-nums">{block.nights} н.</span>
          </div>
        )}
        {!compact && (
          <div className="mt-auto flex items-center gap-2 text-[10px]">
            <span className="rounded bg-background/60 px-1 font-medium">
              {RESERVATION_STATUS_SHORT_UK[reservationStatus]}
            </span>
            {hasBalance ? (
              <span className="inline-flex items-center gap-0.5 text-rose-700">
                <CreditCard className="h-2.5 w-2.5" />
                {block.balance.toFixed(0)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Оплачено
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
