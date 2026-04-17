"use client"

import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { PendingChange, RackBlock, RackKpi, RackRoom, ViewMode } from "@/lib/room-rack/types"
import { addDays, enumerateDays, getRangeForView, parseISO, startOfDay, toISO } from "@/lib/room-rack/date-utils"
import { findConflicts, isValidRange } from "@/lib/room-rack/availability"
import { RoomRackToolbar } from "./room-rack-toolbar"
import { RoomRackLegend } from "./room-rack-legend"
import { RoomRackGrid } from "./room-rack-grid"
import { ReservationDetailsPanel } from "./reservation-details-panel"
import { ConfirmMoveDialog } from "./confirm-move-dialog"
import { CreateReservationDialog } from "./create-reservation-dialog"

interface Props {
  rooms: RackRoom[]
  blocks: RackBlock[]
  today: string
}

export function RoomRackClient({ rooms: initialRooms, blocks: initialBlocks, today }: Props) {
  const [mode, setMode] = useState<ViewMode>("week")
  const [anchor, setAnchor] = useState<Date>(() => parseISO(today))
  const [rooms] = useState<RackRoom[]>(initialRooms)
  const [blocks, setBlocks] = useState<RackBlock[]>(initialBlocks)
  const [search, setSearch] = useState("")
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all")
  const [showLegend, setShowLegend] = useState(false)

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [createContext, setCreateContext] = useState<{ roomId: string; date: string } | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const { start, end } = useMemo(() => getRangeForView(anchor, mode), [anchor, mode])
  const days = useMemo(() => enumerateDays(start, end, startOfDay(parseISO(today))), [start, end, today])

  const roomTypes = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rooms) if (!map.has(r.room_type_id)) map.set(r.room_type_id, r.room_type_name)
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rooms])

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rooms.filter((r) => {
      if (roomTypeFilter !== "all" && r.room_type_id !== roomTypeFilter) return false
      if (!q) return true
      if (r.room_number.toLowerCase().includes(q)) return true
      if (r.room_type_name.toLowerCase().includes(q)) return true
      const blocksOfRoom = blocks.filter((b) => b.room_id === r.id)
      return blocksOfRoom.some(
        (b) =>
          `${b.guest.first_name} ${b.guest.last_name}`.toLowerCase().includes(q) ||
          b.reservation_number.toLowerCase().includes(q),
      )
    })
  }, [rooms, search, roomTypeFilter, blocks])

  const kpi: RackKpi = useMemo(() => {
    const total = rooms.length
    const todayIso = today
    const inHouseBlocks = blocks.filter(
      (b) => b.status === "checked_in" && b.check_in <= todayIso && b.check_out > todayIso,
    )
    const occupied = new Set(inHouseBlocks.map((b) => b.room_id)).size
    const arrivals = blocks.filter((b) => b.check_in === todayIso && b.status === "confirmed").length
    const departures = blocks.filter((b) => b.check_out === todayIso && b.status === "checked_in").length
    const pendingConfirm = blocks.filter((b) => b.status === "pending").length
    return {
      totalRooms: total,
      occupiedRooms: occupied,
      freeRooms: total - occupied,
      occupancyRate: total === 0 ? 0 : Math.round((occupied / total) * 100),
      arrivalsToday: arrivals,
      departuresToday: departures,
      inHouse: inHouseBlocks.length,
      pendingConfirm,
    }
  }, [rooms, blocks, today])

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.reservation_room_id === selectedBlockId) || null,
    [blocks, selectedBlockId],
  )

  /* ---------------- Навігація по датах ----------------- */
  const handlePrev = useCallback(() => {
    setAnchor((a) => (mode === "day" ? addDays(a, -1) : mode === "week" ? addDays(a, -7) : addDays(a, -30)))
  }, [mode])
  const handleNext = useCallback(() => {
    setAnchor((a) => (mode === "day" ? addDays(a, 1) : mode === "week" ? addDays(a, 7) : addDays(a, 30)))
  }, [mode])
  const handleToday = useCallback(() => setAnchor(parseISO(today)), [today])

  /* ---------------- Пропозиція переміщення ----------------- */
  const proposeMove = useCallback(
    (block: RackBlock, targetRoomId: string, newCheckIn: string) => {
      const newCheckOut = toISO(addDays(parseISO(newCheckIn), block.nights))
      if (block.room_id === targetRoomId && block.check_in === newCheckIn) return
      const conflicts = findConflicts(blocks, targetRoomId, newCheckIn, newCheckOut, block.reservation_room_id)
      setPending({ type: "move", block, targetRoomId, newCheckIn, newCheckOut, conflicts })
    },
    [blocks],
  )

  const proposeResize = useCallback(
    (block: RackBlock, side: "start" | "end", newDate: string) => {
      const newCheckIn = side === "start" ? newDate : block.check_in
      const newCheckOut = side === "end" ? newDate : block.check_out
      if (!isValidRange(newCheckIn, newCheckOut)) {
        toast.error("Мінімальна тривалість — 1 ніч")
        return
      }
      if (block.room_id === null) return
      const conflicts = findConflicts(blocks, block.room_id, newCheckIn, newCheckOut, block.reservation_room_id)
      setPending({
        type: side === "start" ? "resize-start" : "resize-end",
        block,
        targetRoomId: block.room_id,
        newCheckIn,
        newCheckOut,
        conflicts,
      })
    },
    [blocks],
  )

  /* ---------------- Підтвердження змін ----------------- */
  const confirmPending = useCallback(async () => {
    if (!pending) return
    const { block, type, targetRoomId, newCheckIn, newCheckOut } = pending
    const prev = blocks

    // Оптимістичне оновлення
    setBlocks((all) =>
      all.map((b) => {
        if (b.reservation_room_id !== block.reservation_room_id) return b
        return {
          ...b,
          room_id: targetRoomId ?? b.room_id,
          check_in: newCheckIn ?? b.check_in,
          check_out: newCheckOut ?? b.check_out,
          nights:
            newCheckIn && newCheckOut
              ? Math.max(
                  1,
                  Math.round(
                    (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24),
                  ),
                )
              : b.nights,
        }
      }),
    )
    setPending(null)

    try {
      if (type === "move") {
        // зміна номера — оновлюємо тільки reservation_rooms.room_id
        // якщо також змінилась дата заїзду (зсув), змінюємо reservations
        const needResUpdate = newCheckIn && newCheckIn !== block.check_in
        const { error: rrErr } = await supabase
          .from("reservation_rooms")
          .update({ room_id: targetRoomId })
          .eq("id", block.reservation_room_id)
        if (rrErr) throw rrErr
        if (needResUpdate) {
          const { error: rErr } = await supabase
            .from("reservations")
            .update({ check_in_date: newCheckIn, check_out_date: newCheckOut })
            .eq("id", block.reservation_id)
          if (rErr) throw rErr
        }
        toast.success("Бронювання переміщено")
      } else {
        // зміна дат — лише reservations
        const { error } = await supabase
          .from("reservations")
          .update({ check_in_date: newCheckIn, check_out_date: newCheckOut })
          .eq("id", block.reservation_id)
        if (error) throw error
        toast.success("Дати бронювання оновлено")
      }
    } catch (e: any) {
      console.error("[v0] room-rack update failed", e)
      setBlocks(prev)
      toast.error("Не вдалося зберегти зміну", { description: e?.message })
    }
  }, [pending, blocks, supabase])

  const cancelPending = useCallback(() => setPending(null), [])

  /* ---------------- Швидке створення ----------------- */
  const openCreate = useCallback((roomId: string, date: string) => {
    setCreateContext({ roomId, date })
  }, [])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      <RoomRackToolbar
        mode={mode}
        onModeChange={setMode}
        anchor={anchor}
        rangeStart={start}
        rangeEnd={end}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        search={search}
        onSearchChange={setSearch}
        roomTypes={roomTypes}
        roomTypeFilter={roomTypeFilter}
        onRoomTypeFilterChange={setRoomTypeFilter}
        kpi={kpi}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend((v) => !v)}
        onCreate={() => setCreateContext({ roomId: filteredRooms[0]?.id ?? "", date: toISO(anchor) })}
      />

      {showLegend && <RoomRackLegend onClose={() => setShowLegend(false)} />}

      <div className="flex flex-1 overflow-hidden">
        <RoomRackGrid
          rooms={filteredRooms}
          blocks={blocks}
          days={days}
          mode={mode}
          onBlockClick={(id) => setSelectedBlockId(id)}
          onMoveBlock={proposeMove}
          onResizeBlock={proposeResize}
          onEmptyCellClick={openCreate}
        />

        {selectedBlock && (
          <ReservationDetailsPanel
            block={selectedBlock}
            room={rooms.find((r) => r.id === selectedBlock.room_id) || null}
            onClose={() => setSelectedBlockId(null)}
          />
        )}
      </div>

      {pending && (
        <ConfirmMoveDialog pending={pending} rooms={rooms} onConfirm={confirmPending} onCancel={cancelPending} />
      )}

      {createContext && (
        <CreateReservationDialog
          context={createContext}
          rooms={rooms}
          onClose={() => setCreateContext(null)}
        />
      )}
    </div>
  )
}
