"use client"

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import { useCallback, useMemo, useRef, useState } from "react"
import type { RackBlock, RackDay, RackRoom, ViewMode } from "@/lib/room-rack/types"
import { ROOM_STATUS_UK } from "@/lib/i18n/uk"
import { cn } from "@/lib/utils"
import { ReservationBlock } from "./reservation-block"
import { formatDayShort, formatWeekday } from "@/lib/room-rack/date-utils"

interface Props {
  rooms: RackRoom[]
  blocks: RackBlock[]
  days: RackDay[]
  mode: ViewMode
  onBlockClick: (id: string) => void
  onMoveBlock: (block: RackBlock, targetRoomId: string, newCheckInIso: string) => void
  onResizeBlock: (block: RackBlock, side: "start" | "end", newIsoDate: string) => void
  onEmptyCellClick: (roomId: string, dateIso: string) => void
}

const ROW_HEIGHT = 56
const LEFT_COL_WIDTH = 200
const HEADER_HEIGHT = 56

export function RoomRackGrid({
  rooms,
  blocks,
  days,
  mode,
  onBlockClick,
  onMoveBlock,
  onResizeBlock,
  onEmptyCellClick,
}: Props) {
  const cellWidth = mode === "month" ? 42 : mode === "week" ? 120 : 240
  const compact = mode === "month"
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const scrollRef = useRef<HTMLDivElement>(null)

  const gridStartIso = days[0]?.iso ?? ""
  const gridEndIso = days[days.length - 1]?.iso ?? ""

  const blocksByRoom = useMemo(() => {
    const map = new Map<string, RackBlock[]>()
    for (const b of blocks) {
      if (!b.room_id) continue
      if (b.check_out <= gridStartIso) continue
      if (b.check_in >= gridEndIso + "_") continue
      const list = map.get(b.room_id) ?? []
      list.push(b)
      map.set(b.room_id, list)
    }
    return map
  }, [blocks, gridStartIso, gridEndIso])

  const activeBlock = useMemo(
    () => blocks.find((b) => b.reservation_room_id === activeBlockId) || null,
    [blocks, activeBlockId],
  )

  const onDragStart = useCallback((e: DragStartEvent) => {
    const id = (e.active.data.current as { blockId?: string } | null)?.blockId
    if (id) setActiveBlockId(id)
  }, [])

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveBlockId(null)
      if (!e.over) return
      const data = e.over.data.current as { roomId?: string; dateIso?: string } | null
      const dragged = e.active.data.current as { blockId?: string } | null
      if (!data?.roomId || !data?.dateIso || !dragged?.blockId) return
      const block = blocks.find((b) => b.reservation_room_id === dragged.blockId)
      if (!block) return
      onMoveBlock(block, data.roomId, data.dateIso)
    },
    [blocks, onMoveBlock],
  )

  const totalWidth = cellWidth * days.length

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div ref={scrollRef} className="relative flex-1 overflow-auto" style={{ contain: "layout paint" }}>
        <div
          className="relative"
          style={{ width: `${LEFT_COL_WIDTH + totalWidth}px`, minHeight: `${HEADER_HEIGHT + ROW_HEIGHT * rooms.length}px` }}
        >
          {/* ── Header ── */}
          <div
            className="sticky top-0 z-30 flex border-b bg-card"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            {/* ліва колонка header */}
            <div
              className="sticky left-0 z-40 flex shrink-0 items-center border-r bg-card px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              style={{ width: `${LEFT_COL_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
            >
              Номери
            </div>
            {/* дата-колонки header */}
            <div className="flex" style={{ width: `${totalWidth}px`, height: `${HEADER_HEIGHT}px` }}>
              {days.map((d) => (
                <div
                  key={d.iso}
                  className={cn(
                    "flex shrink-0 flex-col items-center justify-center border-r text-xs",
                    d.isWeekend && "bg-muted/40",
                    d.isToday && "bg-primary/10 font-semibold text-primary",
                    d.isMonthStart && !d.isToday && "bg-accent/10",
                  )}
                  style={{ width: `${cellWidth}px`, height: `${HEADER_HEIGHT}px` }}
                >
                  <span className="text-[10px] uppercase text-muted-foreground">{formatWeekday(d.date)}</span>
                  <span className="text-sm font-medium tabular-nums">{formatDayShort(d.date)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rows ── */}
          {rooms.map((room) => {
            const roomBlocks = blocksByRoom.get(room.id) ?? []
            const isBlocked = room.status === "maintenance" || room.status === "out_of_order" || room.status === "blocked"
            return (
              <div
                key={room.id}
                className="relative flex border-b"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {/* ліва колонка */}
                <RoomRowLabel room={room} />

                {/* клітинки-droppables */}
                <div
                  className={cn("relative flex", isBlocked && "bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(148,163,184,0.12)_8px,rgba(148,163,184,0.12)_16px)]")}
                  style={{ width: `${totalWidth}px`, height: `${ROW_HEIGHT}px` }}
                >
                  {days.map((d) => (
                    <DayCell
                      key={d.iso}
                      roomId={room.id}
                      day={d}
                      cellWidth={cellWidth}
                      disabled={isBlocked}
                      onEmptyClick={onEmptyCellClick}
                    />
                  ))}

                  {/* Блоки бронювань накладаються поверх клітинок */}
                  {roomBlocks.map((b) => {
                    const startIdx = Math.max(0, days.findIndex((d) => d.iso >= b.check_in))
                    const endIdxRaw = days.findIndex((d) => d.iso >= b.check_out)
                    const endIdx = endIdxRaw === -1 ? days.length : endIdxRaw
                    // Враховуємо заїзди до початку й виїзди після кінця сітки
                    const spansBeforeStart = b.check_in < gridStartIso
                    const spansAfterEnd = b.check_out > gridEndIso
                    const left = (spansBeforeStart ? 0 : startIdx) * cellWidth
                    const rightIdx = spansAfterEnd ? days.length : endIdx
                    const width = Math.max(cellWidth / 2, (rightIdx - (spansBeforeStart ? 0 : startIdx)) * cellWidth)
                    if (width <= 0) return null
                    return (
                      <ReservationBlock
                        key={b.reservation_room_id}
                        block={b}
                        left={left}
                        width={width}
                        cellWidth={cellWidth}
                        compact={compact}
                        gridStartIso={gridStartIso}
                        gridEndIso={gridEndIso}
                        onClick={onBlockClick}
                        onResize={onResizeBlock}
                        isSelected={false}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {rooms.length === 0 && (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Немає номерів для відображення
            </div>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null} />
    </DndContext>
  )
}

function RoomRowLabel({ room }: { room: RackRoom }) {
  const statusLabel = ROOM_STATUS_UK[room.status] ?? room.status
  return (
    <div
      className="sticky left-0 z-20 flex shrink-0 items-center gap-3 border-r bg-card px-3"
      style={{ width: `${LEFT_COL_WIDTH}px`, height: `${ROW_HEIGHT}px` }}
    >
      <div
        className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(room.status))}
        aria-label={statusLabel}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold tabular-nums">{room.room_number}</span>
          <span className="text-[11px] text-muted-foreground">пов. {room.floor}</span>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{room.room_type_name}</div>
      </div>
    </div>
  )
}

function DayCell({
  roomId,
  day,
  cellWidth,
  disabled,
  onEmptyClick,
}: {
  roomId: string
  day: RackDay
  cellWidth: number
  disabled: boolean
  onEmptyClick: (roomId: string, dateIso: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${roomId}:${day.iso}`,
    data: { roomId, dateIso: day.iso },
    disabled,
  })
  return (
    <div
      ref={setNodeRef}
      onClick={() => !disabled && onEmptyClick(roomId, day.iso)}
      className={cn(
        "relative shrink-0 border-r transition-colors",
        day.isWeekend && "bg-muted/30",
        day.isToday && "bg-primary/5",
        isOver && !disabled && "bg-accent/20 ring-2 ring-inset ring-accent",
        !disabled && "cursor-pointer hover:bg-muted/50",
      )}
      style={{ width: `${cellWidth}px`, height: "100%" }}
      aria-label={`${day.iso} — порожньо`}
    />
  )
}

function dotColor(status: string): string {
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
