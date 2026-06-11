"use client"

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { BedDouble, Sparkles, Wrench } from "lucide-react"
import type { RackBlock, RackDay, RackRoom, ViewMode } from "@/lib/room-rack/types"
import { ROOM_STATUS_UK } from "@/lib/i18n/uk"
import {
  formatRoomHousekeepingStatus,
  formatRoomOccupancyStatus,
  formatRoomOperationalStatus,
} from "@/lib/localization"
import { cn } from "@/lib/utils"
import { ReservationBlock, ReservationBlockPreview } from "./reservation-block"
import { addDays, formatDayShort, formatWeekday, parseISO, toISO } from "@/lib/room-rack/date-utils"

interface Props {
  rooms: RackRoom[]
  blocks: RackBlock[]
  days: RackDay[]
  mode: ViewMode
  onBlockClick: (id: string) => void
  onMoveBlock: (block: RackBlock, targetRoomId: string, newCheckInIso: string) => void
  onResizeBlock: (block: RackBlock, side: "start" | "end", newIsoDate: string) => void
  onEmptyCellClick: (roomId: string, dateIso: string) => void
  onRangeSelect: (roomId: string, checkInIso: string, checkOutIso: string) => void
}

const LEFT_COL_WIDTH = 230
const ROW_HEIGHT = 56
const HEADER_HEIGHT = 56
const INACTIVE_RESERVATION_STATUSES = new Set(["cancelled", "no_show"])

export function RoomRackGrid({
  rooms,
  blocks,
  days,
  mode,
  onBlockClick,
  onMoveBlock,
  onResizeBlock,
  onEmptyCellClick,
  onRangeSelect,
}: Props) {
  const cellWidth = mode === "month" ? 64 : mode === "week" ? 120 : 240
  const compact = mode === "month"
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ roomId: string; startIso: string; currentIso: string } | null>(null)
  const [selectionReveal, setSelectionReveal] = useState(false)
  const selectionRef = useRef<{ roomId: string; startIso: string; currentIso: string } | null>(null)
  const suppressClickRef = useRef(false)
  const revealRafRef = useRef<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const scrollRef = useRef<HTMLDivElement>(null)

  const gridStartIso = days[0]?.iso ?? ""
  const gridEndIso = days[days.length - 1]?.iso ?? ""
  const activeBlock = useMemo(
    () => blocks.find((b) => b.reservation_room_id === activeBlockId) ?? null,
    [activeBlockId, blocks],
  )

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
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aInactive = INACTIVE_RESERVATION_STATUSES.has(a.status)
        const bInactive = INACTIVE_RESERVATION_STATUSES.has(b.status)
        if (aInactive !== bInactive) return aInactive ? 1 : -1
        return a.check_in.localeCompare(b.check_in)
      })
    }
    return map
  }, [blocks, gridStartIso, gridEndIso])

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
      if (!data?.roomId || !dragged?.blockId) return
      const block = blocks.find((b) => b.reservation_room_id === dragged.blockId)
      if (!block) return
      const dayDelta = Math.round(e.delta.x / cellWidth)
      const newCheckInIso = toISO(addDays(parseISO(block.check_in), dayDelta))
      onMoveBlock(block, data.roomId, newCheckInIso)
    },
    [blocks, cellWidth, onMoveBlock],
  )

  const handleSelectionStart = useCallback((_roomId: string, _dateIso: string) => {
    suppressClickRef.current = false
    const next = { roomId: _roomId, startIso: _dateIso, currentIso: _dateIso }
    selectionRef.current = next
    setSelection(next)
  }, [])

  const handleSelectionMove = useCallback((roomId: string, dateIso: string) => {
    const current = selectionRef.current
    if (!current || current.roomId !== roomId || current.currentIso === dateIso) return
    const next = { ...current, currentIso: dateIso }
    selectionRef.current = next
    setSelection(next)
  }, [])

  const handleSelectionEnd = useCallback(() => {
    const current = selectionRef.current
    if (!current) return

    selectionRef.current = null
    setSelection(null)

    const start = parseISO(current.startIso)
    const end = parseISO(current.currentIso)
    const moved = current.startIso !== current.currentIso
    const checkIn = toISO(start <= end ? start : end)
    const checkOut = toISO(addDays(start <= end ? end : start, 1))

    suppressClickRef.current = true
    if (moved) {
      onRangeSelect(current.roomId, checkIn, checkOut)
    } else {
      onEmptyCellClick(current.roomId, current.startIso)
    }
  }, [onEmptyCellClick, onRangeSelect])

  const handleCellClick = useCallback(
    (roomId: string, dateIso: string) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      onEmptyCellClick(roomId, dateIso)
    },
    [onEmptyCellClick],
  )

  useEffect(() => {
    if (!selection) return

    setSelectionReveal(false)
    if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current)
    revealRafRef.current = requestAnimationFrame(() => setSelectionReveal(true))

    const endSelection = () => {
      handleSelectionEnd()
    }

    window.addEventListener("pointerup", endSelection)
    window.addEventListener("pointercancel", endSelection)

    return () => {
      if (revealRafRef.current) cancelAnimationFrame(revealRafRef.current)
      window.removeEventListener("pointerup", endSelection)
      window.removeEventListener("pointercancel", endSelection)
    }
  }, [handleSelectionEnd, selection])

  useEffect(() => {
    if (!selection) {
      setSelectionReveal(false)
    }
  }, [selection])

  const totalWidth = cellWidth * days.length

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-auto" style={{ contain: "layout paint" }}>
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
                  <span className="text-[11px] uppercase leading-none text-muted-foreground">{formatWeekday(d.date)}</span>
                  <span className="mt-1 text-sm font-medium leading-none tabular-nums">{formatDayShort(d.date)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rows ── */}
          {rooms.map((room) => {
            const roomBlocks = blocksByRoom.get(room.id) ?? []
            const isBlocked = room.operational_status
              ? room.operational_status !== "operational"
              : room.status === "maintenance" || room.status === "out_of_order" || room.status === "blocked"
            const selectionOnRow = selection?.roomId === room.id ? selection : null
            const selectionStartIdx = selectionOnRow
              ? days.findIndex((d) => d.iso === (selectionOnRow.startIso < selectionOnRow.currentIso ? selectionOnRow.startIso : selectionOnRow.currentIso))
              : -1
            const selectionEndIdx = selectionOnRow
              ? days.findIndex((d) => d.iso === (selectionOnRow.startIso < selectionOnRow.currentIso ? selectionOnRow.currentIso : selectionOnRow.startIso))
              : -1
            const hasRowSelection = selectionStartIdx >= 0 && selectionEndIdx >= 0
            const selectionLeft = hasRowSelection ? Math.min(selectionStartIdx, selectionEndIdx) * cellWidth : 0
            const selectionWidth = hasRowSelection ? (Math.abs(selectionEndIdx - selectionStartIdx) + 1) * cellWidth : 0
            return (
              <div
                key={room.id}
                className="relative flex border-b"
                style={{ height: `${ROW_HEIGHT}px` }}
                title={
                  isBlocked
                    ? `Номер недоступний для заселення: ${formatRoomOperationalStatus(
                        room.operational_status,
                      )}`
                    : undefined
                }
              >
                {/* ліва колонка */}
                <RoomRowLabel room={room} />

                {/* клітинки-droppables */}
                <div
                  className={cn("relative flex", isBlocked && "bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(148,163,184,0.12)_8px,rgba(148,163,184,0.12)_16px)]")}
                  style={{ width: `${totalWidth}px`, height: `${ROW_HEIGHT}px` }}
                >
                  {hasRowSelection && (
                    <div
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute z-10 rounded-md bg-sky-400/20 ring-1 ring-inset ring-sky-500/40 shadow-[inset_0_0_24px_rgba(14,165,233,0.18)] transition-all duration-150 ease-out",
                        selectionStartIdx === selectionEndIdx && "bg-sky-400/25",
                        selectionReveal ? "opacity-100 scale-100" : "opacity-0 scale-[0.985]",
                      )}
                      style={{
                        left: `${selectionLeft}px`,
                        width: `${selectionWidth}px`,
                        top: "6px",
                        bottom: "6px",
                      }}
                    />
                  )}

                  {days.map((d) => (
                    <DayCell
                      key={d.iso}
                      roomId={room.id}
                      day={d}
                      cellWidth={cellWidth}
                      disabled={isBlocked}
                      onEmptyClick={handleCellClick}
                      onSelectionStart={handleSelectionStart}
                      onSelectionMove={handleSelectionMove}
                      isInSelection={
                        selection?.roomId === room.id &&
                        selection !== null &&
                        (() => {
                          const start = selection.startIso < selection.currentIso ? selection.startIso : selection.currentIso
                          const end = selection.startIso < selection.currentIso ? selection.currentIso : selection.startIso
                          return d.iso >= start && d.iso <= end
                        })()
                      }
                      isSelectionStart={selection?.roomId === room.id && selection?.startIso === d.iso}
                      isSelectionEnd={
                        selectionOnRow !== null &&
                        (selectionOnRow.startIso < selectionOnRow.currentIso
                          ? selectionOnRow.currentIso === d.iso
                          : selectionOnRow.startIso === d.iso)
                      }
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

      <DragOverlay dropAnimation={null} zIndex={80}>
        {activeBlock ? (
          <ReservationBlockPreview
            block={activeBlock}
            width={Math.max(cellWidth / 2, activeBlock.nights * cellWidth)}
            compact={compact}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function RoomRowLabel({ room }: { room: RackRoom }) {
  const statusLabel = ROOM_STATUS_UK[room.status] ?? room.status
  const stateLabel =
    room.occupancy_status && room.housekeeping_status && room.operational_status
      ? [
          formatRoomOccupancyStatus(room.occupancy_status),
          formatRoomHousekeepingStatus(room.housekeeping_status),
          formatRoomOperationalStatus(room.operational_status),
        ].join(" / ")
      : statusLabel

  return (
    <div
      className="sticky left-0 z-20 flex shrink-0 items-center gap-3 border-r bg-card px-3"
      style={{ width: `${LEFT_COL_WIDTH}px`, height: `${ROW_HEIGHT}px` }}
    >
      {room.occupancy_status && room.housekeeping_status && room.operational_status ? (
        <div
          className="flex shrink-0 gap-0.5"
          aria-label={stateLabel}
          title={`Проживання / прибирання / технічний стан: ${stateLabel}`}
        >
          <StateIcon
            label={`Проживання: ${formatRoomOccupancyStatus(room.occupancy_status)}`}
            className={occupancyIndicatorColor(room.occupancy_status)}
          >
            <BedDouble className="h-2.5 w-2.5" />
          </StateIcon>
          <StateIcon
            label={`Прибирання: ${formatRoomHousekeepingStatus(room.housekeeping_status)}`}
            className={housekeepingIndicatorColor(room.housekeeping_status)}
          >
            <Sparkles className="h-2.5 w-2.5" />
          </StateIcon>
          <StateIcon
            label={`Технічний стан: ${formatRoomOperationalStatus(room.operational_status)}`}
            className={operationalIndicatorColor(room.operational_status)}
          >
            <Wrench className="h-2.5 w-2.5" />
          </StateIcon>
        </div>
      ) : (
        <div
          className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(room.status))}
          aria-label={stateLabel}
          title={stateLabel}
        />
      )}
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

function StateIcon({
  label,
  className,
  children,
}: {
  label: string
  className: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded border",
        className,
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </span>
  )
}

function DayCell({
  roomId,
  day,
  cellWidth,
  disabled,
  onEmptyClick,
  onSelectionStart,
  onSelectionMove,
  isInSelection,
  isSelectionStart,
  isSelectionEnd,
}: {
  roomId: string
  day: RackDay
  cellWidth: number
  disabled: boolean
  onEmptyClick: (roomId: string, dateIso: string) => void
  onSelectionStart: (roomId: string, dateIso: string) => void
  onSelectionMove: (roomId: string, dateIso: string) => void
  isInSelection: boolean
  isSelectionStart: boolean
  isSelectionEnd: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${roomId}:${day.iso}`,
    data: { roomId, dateIso: day.iso },
    disabled,
  })
  return (
    <div
      ref={setNodeRef}
      data-rack-cell
      data-room-id={roomId}
      data-date-iso={day.iso}
      onClick={() => !disabled && onEmptyClick(roomId, day.iso)}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return
        e.preventDefault()
        onSelectionStart(roomId, day.iso)
      }}
      onPointerEnter={() => {
        if (!disabled) onSelectionMove(roomId, day.iso)
      }}
      className={cn(
        "relative shrink-0 border-r transition-colors",
        day.isWeekend && "bg-muted/30",
        day.isToday && "bg-primary/5",
        isOver && !disabled && "bg-accent/20 ring-2 ring-inset ring-accent",
        isInSelection && !disabled && "bg-primary/15",
        isSelectionStart && !disabled && "ring-1 ring-inset ring-primary/70",
        isSelectionEnd && !disabled && "ring-1 ring-inset ring-primary/70",
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

function occupancyIndicatorColor(status: string): string {
  switch (status) {
    case "vacant":
      return "border-slate-300 bg-white text-slate-500"
    case "occupied":
      return "border-blue-600 bg-blue-600 text-white"
    default:
      return "border-slate-300 bg-slate-100 text-slate-600"
  }
}

function housekeepingIndicatorColor(status: string): string {
  switch (status) {
    case "clean":
      return "border-sky-300 bg-sky-100 text-sky-700"
    case "dirty":
      return "border-rose-600 bg-rose-600 text-white"
    case "cleaning":
      return "border-amber-500 bg-amber-100 text-amber-800"
    case "inspecting":
      return "border-violet-600 bg-violet-600 text-white"
    case "inspected":
      return "border-teal-600 bg-teal-600 text-white"
    default:
      return "border-slate-300 bg-slate-100 text-slate-600"
  }
}

function operationalIndicatorColor(status: string): string {
  switch (status) {
    case "operational":
      return "border-emerald-300 bg-emerald-100 text-emerald-700"
    case "maintenance":
      return "border-orange-500 bg-orange-100 text-orange-800"
    case "out_of_order":
      return "border-red-700 bg-red-700 text-white"
    case "blocked":
      return "border-slate-600 bg-slate-600 text-white"
    default:
      return "border-slate-300 bg-slate-100 text-slate-600"
  }
}
