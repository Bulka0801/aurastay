"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { PendingChange, RackBlock, RackKpi, RackRoom, ViewMode } from "@/lib/room-rack/types"
import { addDays, enumerateDays, getRangeForView, parseISO, startOfDay, toISO } from "@/lib/room-rack/date-utils"
import { findConflicts, isValidRange } from "@/lib/room-rack/availability"
import {
  applyRoomRackFilters,
  type RackReservationStatusFilter,
  type RackRoomStateFilter,
} from "@/lib/room-rack/filters"
import { calculateRoomRackKpi } from "@/lib/room-rack/kpi"
import { buildRackPricingImpact } from "@/lib/room-rack/pricing"
import { getRoomRackErrorMessage, type RoomRackErrorMessage } from "@/lib/room-rack/errors"
import { useMediaQuery } from "@/hooks/use-media-query"
import { RoomRackToolbar } from "./room-rack-toolbar"
import { RoomRackLegend } from "./room-rack-legend"
import { RoomRackGrid } from "./room-rack-grid"
import { ReservationDetailsPanel } from "./reservation-details-panel"
import { ConfirmMoveDialog } from "./confirm-move-dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useRouter } from "next/navigation"

interface Props {
  rooms: RackRoom[]
  blocks: RackBlock[]
  today: string
}

const INACTIVE_RESERVATION_STATUSES = new Set<RackBlock["status"]>(["cancelled", "no_show"])

export function RoomRackClient({ rooms: initialRooms, blocks: initialBlocks, today }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<ViewMode>("week")
  const [anchor, setAnchor] = useState<Date>(() => parseISO(today))
  const [rooms, setRooms] = useState<RackRoom[]>(initialRooms)
  const [blocks, setBlocks] = useState<RackBlock[]>(initialBlocks)
  const [search, setSearch] = useState("")
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all")
  const [roomStateFilter, setRoomStateFilter] = useState<RackRoomStateFilter>("all")
  const [reservationStatusFilter, setReservationStatusFilter] = useState<RackReservationStatusFilter>("all")
  const [showInactiveReservations, setShowInactiveReservations] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [pendingError, setPendingError] = useState<RoomRackErrorMessage | null>(null)
  const [confirmingPending, setConfirmingPending] = useState(false)
  const showSidebarDetails = useMediaQuery("(min-width: 1536px)")

  const supabase = useMemo(() => createClient(), [])
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshRack = useCallback(() => {
    startTransition(() => {
      router.refresh()
    })
  }, [router])

  const scheduleRackRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(refreshRack, 250)
  }, [refreshRack])

  useEffect(() => {
    setRooms(initialRooms)
  }, [initialRooms])

  useEffect(() => {
    setBlocks(initialBlocks)
  }, [initialBlocks])

  useEffect(() => {
    const channel = supabase
      .channel("room-rack-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, scheduleRackRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservation_rooms" }, scheduleRackRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, scheduleRackRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, scheduleRackRefresh)
      .subscribe()

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleRackRefresh()
    }

    window.addEventListener("focus", scheduleRackRefresh)
    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      window.removeEventListener("focus", scheduleRackRefresh)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      supabase.removeChannel(channel)
    }
  }, [scheduleRackRefresh, supabase])

  const { start, end } = useMemo(() => getRangeForView(anchor, mode), [anchor, mode])
  const days = useMemo(() => enumerateDays(start, end, startOfDay(parseISO(today))), [start, end, today])

  const roomTypes = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rooms) if (!map.has(r.room_type_id)) map.set(r.room_type_id, r.room_type_name)
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rooms])

  const { rooms: filteredRooms, blocks: visibleBlocks } = useMemo(
    () => {
      const blocksForView = showInactiveReservations
        ? blocks
        : blocks.filter((block) => !INACTIVE_RESERVATION_STATUSES.has(block.status))

      return applyRoomRackFilters(rooms, blocksForView, {
        search,
        roomTypeFilter,
        roomStateFilter,
        reservationStatusFilter,
      })
    },
    [rooms, blocks, search, roomTypeFilter, roomStateFilter, reservationStatusFilter, showInactiveReservations],
  )

  const kpi: RackKpi = useMemo(() => calculateRoomRackKpi(rooms, blocks, today), [rooms, blocks, today])

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
      const targetRoom = rooms.find((room) => room.id === targetRoomId)
      const pricing = buildRackPricingImpact({ block, targetRoom, newCheckIn, newCheckOut })
      setPendingError(null)
      setPending({ type: "move", block, targetRoomId, newCheckIn, newCheckOut, conflicts, pricing })
    },
    [blocks, rooms],
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
      const targetRoom = rooms.find((room) => room.id === block.room_id)
      const pricing = buildRackPricingImpact({ block, targetRoom, newCheckIn, newCheckOut })
      setPendingError(null)
      setPending({
        type: side === "start" ? "resize-start" : "resize-end",
        block,
        targetRoomId: block.room_id,
        newCheckIn,
        newCheckOut,
        conflicts,
        pricing,
      })
    },
    [blocks, rooms],
  )

  /* ---------------- Підтвердження змін ----------------- */
  const confirmPending = useCallback(async () => {
    if (!pending || confirmingPending) return
    setPendingError(null)
    setConfirmingPending(true)
    const { block, type, targetRoomId, newCheckIn, newCheckOut, pricing } = pending
    const prev = blocks
    const targetRoom = rooms.find((room) => room.id === targetRoomId)
    const nextTotal = pricing?.newTotal ?? block.total_amount
    const nextRate = pricing?.newNightlyRate ?? block.rate
    const nextRoomTypeId = targetRoom?.room_type_id ?? block.room_type_id
    const projectedBalance = nextTotal - block.paid_amount
    const hasOverpayment = projectedBalance < -0.01

    // Оптимістичне оновлення
    setBlocks((all) =>
      all.map((b) => {
        if (b.reservation_room_id !== block.reservation_room_id) return b
        return {
          ...b,
          moved_from_room_id:
            type === "move" && targetRoomId !== b.room_id
              ? b.room_id
              : b.moved_from_room_id,
          room_id: targetRoomId ?? b.room_id,
          room_type_id: nextRoomTypeId ?? b.room_type_id,
          check_in: newCheckIn ?? b.check_in,
          check_out: newCheckOut ?? b.check_out,
          rate: nextRate,
          total_amount: nextTotal,
          balance: nextTotal - b.paid_amount,
          payment_status: b.paid_amount >= nextTotal && nextTotal > 0 ? "paid" : b.paid_amount > 0 ? "partial" : "pending",
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

    try {
      const { error } = await supabase.rpc("move_room_rack_reservation_room", {
        p_reservation_room_id: block.reservation_room_id,
        p_target_room_id: targetRoomId,
        p_check_in_date: newCheckIn,
        p_check_out_date: newCheckOut,
        p_total_amount: nextTotal,
        p_rate: nextRate,
      })

      if (error) throw error

      if (type === "move") {
        toast.success("Бронювання переміщено", {
          description: hasOverpayment
            ? "Вартість перераховано. У бронюванні виникла переплата до повернення при виселенні."
            : pricing?.requiresReview
              ? "Вартість проживання перераховано."
              : undefined,
        })
      } else {
        toast.success("Дати бронювання оновлено", {
          description: hasOverpayment
            ? "Вартість перераховано. У бронюванні виникла переплата до повернення при виселенні."
            : pricing?.requiresReview
              ? "Вартість проживання перераховано."
              : undefined,
        })
      }
      setPending(null)
      setPendingError(null)
      refreshRack()
    } catch (e: any) {
      console.error("[v0] room-rack update failed", e)
      setBlocks(prev)
      const errorMessage = getRoomRackErrorMessage(e)
      setPendingError(errorMessage)
      toast.error(errorMessage.title, { description: errorMessage.description })
    } finally {
      setConfirmingPending(false)
    }
  }, [pending, confirmingPending, blocks, rooms, supabase, refreshRack])

  const cancelPending = useCallback(() => {
    setPending(null)
    setPendingError(null)
  }, [])

  const handleShowInactiveReservationsChange = useCallback((checked: boolean) => {
    setShowInactiveReservations(checked)
    if (!checked) {
      setReservationStatusFilter((status) => (INACTIVE_RESERVATION_STATUSES.has(status as RackBlock["status"]) ? "all" : status))
      setSelectedBlockId((selectedId) => {
        const selected = blocks.find((block) => block.reservation_room_id === selectedId)
        return selected && INACTIVE_RESERVATION_STATUSES.has(selected.status) ? null : selectedId
      })
    }
  }, [blocks])

  /* ---------------- Швидке створення ----------------- */
  const openCreate = useCallback((roomId: string, checkIn: string) => {
    const checkOut = toISO(addDays(parseISO(checkIn), 1))
    const params = new URLSearchParams({
      roomId,
      checkIn,
      checkOut,
      adults: "1",
    })
    router.push(`/dashboard/reservations/new?${params.toString()}`)
  }, [router])

  const openCreateRange = useCallback((roomId: string, checkIn: string, checkOut: string) => {
    const params = new URLSearchParams({
      roomId,
      checkIn,
      checkOut,
      adults: "1",
    })
    router.push(`/dashboard/reservations/new?${params.toString()}`)
  }, [router])

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-background">
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
        onCreate={() => {
          const firstRoom = filteredRooms[0]
          if (firstRoom) openCreate(firstRoom.id, toISO(anchor))
        }}
      />

      {showLegend && (
        <RoomRackLegend
          onClose={() => setShowLegend(false)}
          activeRoomState={roomStateFilter}
          activeReservationStatus={reservationStatusFilter}
          showInactiveReservations={showInactiveReservations}
          onRoomStateChange={setRoomStateFilter}
          onReservationStatusChange={setReservationStatusFilter}
          onShowInactiveReservationsChange={handleShowInactiveReservationsChange}
        />
      )}

      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        <RoomRackGrid
          rooms={filteredRooms}
          blocks={visibleBlocks}
          days={days}
          mode={mode}
          onBlockClick={(id) => setSelectedBlockId(id)}
          onMoveBlock={proposeMove}
          onResizeBlock={proposeResize}
          onEmptyCellClick={openCreate}
          onRangeSelect={openCreateRange}
        />

        {selectedBlock && showSidebarDetails && (
          <ReservationDetailsPanel
            block={selectedBlock}
            room={rooms.find((r) => r.id === selectedBlock.room_id) || null}
            previousRoom={rooms.find((r) => r.id === selectedBlock.moved_from_room_id) || null}
            onClose={() => setSelectedBlockId(null)}
            layout="sidebar"
          />
        )}
      </div>

      {selectedBlock && !showSidebarDetails && (
        <Sheet open onOpenChange={(open) => !open && setSelectedBlockId(null)}>
          <SheetContent side="right" className="w-[min(92vw,24rem)] p-0 [&>button]:hidden">
            <ReservationDetailsPanel
              block={selectedBlock}
              room={rooms.find((r) => r.id === selectedBlock.room_id) || null}
              previousRoom={rooms.find((r) => r.id === selectedBlock.moved_from_room_id) || null}
              onClose={() => setSelectedBlockId(null)}
              layout="drawer"
            />
          </SheetContent>
        </Sheet>
      )}

      {pending && (
        <ConfirmMoveDialog
          pending={pending}
          rooms={rooms}
          confirming={confirmingPending}
          error={pendingError}
          onConfirm={confirmPending}
          onCancel={cancelPending}
        />
      )}
    </div>
  )
}
