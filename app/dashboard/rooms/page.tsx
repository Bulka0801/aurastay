import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  formatRoomHousekeepingStatus,
  formatRoomOccupancyStatus,
  formatRoomOperationalStatus,
} from "@/lib/localization"
import { DashboardPageHeader } from "@/components/dashboards/dashboard-primitives"
import { RoomTypeFilter } from "@/components/rooms/room-class-filter"
import { RoomTypeCards, type RoomTypeRow } from "@/components/rooms/room-type-cards"
import {
  isRoomStateReadyForCheckIn,
  roomMatchesStateFilter,
  type RoomStateFilter,
} from "@/lib/rooms/availability"
import type {
  RoomHousekeepingStatus,
  RoomOccupancyStatus,
  RoomOperationalStatus,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const roomTypeLabels: Record<string, string> = {
  "Standard Room": "Стандартний номер",
  "Deluxe Room": "Номер «Делюкс»",
  "Junior Suite": "Напівлюкс",
  "Executive Suite": "Представницький люкс",
  "Presidential Suite": "Президентський люкс",
}

function formatRoomTypeName(name?: string | null) {
  if (!name) return "—"
  return roomTypeLabels[name] ?? name
}

type RoomsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}

type RoomRow = {
  id: string
  room_number: string
  floor: number | null
  status: string
  occupancy_status?: RoomOccupancyStatus | null
  housekeeping_status?: RoomHousekeepingStatus | null
  operational_status?: RoomOperationalStatus | null
  room_type_id: string
  room_type?: { name?: string | null } | null
}

function getSearchValue(searchParams: Record<string, string | string[] | undefined>, key: string) {
  const value = searchParams[key]
  return Array.isArray(value) ? value[0] : value
}

const roomStateFilterGroups: Array<{
  label: string
  items: Array<{ value: RoomStateFilter; label: string }>
}> = [
  {
    label: "Проживання",
    items: [
      { value: "occupancy:vacant", label: "Вільний" },
      { value: "occupancy:occupied", label: "Зайнятий" },
    ],
  },
  {
    label: "Прибирання",
    items: [
      { value: "housekeeping:clean", label: "Чистий" },
      { value: "housekeeping:dirty", label: "Потребує прибирання" },
      { value: "housekeeping:cleaning", label: "Прибирається" },
      { value: "housekeeping:inspecting", label: "На перевірці" },
      { value: "housekeeping:inspected", label: "Перевірено" },
    ],
  },
  {
    label: "Технічний стан",
    items: [
      { value: "operational:operational", label: "Справний" },
      { value: "operational:maintenance", label: "На техобслуговуванні" },
      { value: "operational:out_of_order", label: "Не в експлуатації" },
      { value: "operational:blocked", label: "Тимчасово недоступний" },
    ],
  },
]

const validRoomStateFilters = new Set<RoomStateFilter>([
  "all",
  "readiness:ready",
  ...roomStateFilterGroups.flatMap((group) => group.items.map((item) => item.value)),
])

const legacyStatusFilters: Record<string, RoomStateFilter> = {
  available: "readiness:ready",
  occupied: "occupancy:occupied",
  dirty: "housekeeping:dirty",
  cleaning: "housekeeping:cleaning",
  inspecting: "housekeeping:inspecting",
  inspected: "housekeeping:inspected",
  maintenance: "operational:maintenance",
  out_of_order: "operational:out_of_order",
  blocked: "operational:blocked",
}

const roomTypeCardsVisibleRoles = new Set([
  "general_manager",
  "front_desk_manager",
  "front_desk_agent",
])

function isRoomStateFilter(value?: string): value is RoomStateFilter {
  return Boolean(value && validRoomStateFilters.has(value as RoomStateFilter))
}

function getRoomStateFilterLabel(filter: RoomStateFilter) {
  if (filter === "all") return "Усі номери"
  if (filter === "readiness:ready") return "Готові до заселення"
  return roomStateFilterGroups
    .flatMap((group) => group.items)
    .find((item) => item.value === filter)?.label ?? filter
}

function buildRoomsHref(state: RoomStateFilter, roomTypeId?: string) {
  const params = new URLSearchParams()
  if (state !== "all") params.set("state", state)
  if (roomTypeId && roomTypeId !== "all") params.set("roomType", roomTypeId)
  const query = params.toString()
  return query ? `/dashboard/rooms?${query}` : "/dashboard/rooms"
}

function buildRoomTypeSet(roomTypes: RoomTypeRow[]) {
  return new Set(roomTypes.map((type) => type.id))
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
  const supabase = await createServerClient()
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {})
  const requestedState = getSearchValue(resolvedSearchParams, "state")
  const legacyStatus = getSearchValue(resolvedSearchParams, "status")
  const requestedRoomType =
    getSearchValue(resolvedSearchParams, "roomType") ??
    getSearchValue(resolvedSearchParams, "roomCategory")
  const activeRoomState: RoomStateFilter = isRoomStateFilter(requestedState)
    ? requestedState
    : legacyStatusFilters[legacyStatus ?? ""] ?? "all"

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  // Завантажуємо всі типи номерів
  const { data: roomTypes } = await supabase.from("room_types").select("*").order("base_rate", { ascending: true })

  // Завантажуємо всі номери
  const { data: rooms } = await supabase
    .from("rooms")
    .select(`
      *,
      room_type:room_types (*)
    `)
    .order("room_number", { ascending: true })

  const occupancyColors: Record<string, string> = {
    vacant: "border-emerald-200 bg-emerald-50 text-emerald-800",
    occupied: "border-blue-200 bg-blue-50 text-blue-800",
  }
  const housekeepingColors: Record<string, string> = {
    clean: "border-cyan-200 bg-cyan-50 text-cyan-800",
    dirty: "border-rose-200 bg-rose-50 text-rose-800",
    cleaning: "border-amber-200 bg-amber-50 text-amber-800",
    inspecting: "border-indigo-200 bg-indigo-50 text-indigo-800",
    inspected: "border-teal-200 bg-teal-50 text-teal-800",
  }
  const operationalColors: Record<string, string> = {
    operational: "border-slate-200 bg-slate-50 text-slate-700",
    maintenance: "border-orange-200 bg-orange-50 text-orange-800",
    out_of_order: "border-red-300 bg-red-50 text-red-900",
    blocked: "border-zinc-300 bg-zinc-100 text-zinc-800",
  }
  const allRoomTypes = (roomTypes || []) as RoomTypeRow[]
  const allRooms = (rooms || []) as RoomRow[]
  const roomTypeOptions = allRoomTypes
    .map((type) => ({
      value: type.id,
      label: `${formatRoomTypeName(type.name)}${type.code ? ` (${type.code})` : ""}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "uk"))
  const activeRoomType = allRoomTypes.some((type) => type.id === requestedRoomType)
    ? requestedRoomType!
    : "all"
  const selectedRoomType = allRoomTypes.find((type) => type.id === activeRoomType)
  const filteredRoomTypes =
    activeRoomType === "all"
      ? allRoomTypes
      : allRoomTypes.filter((type) => type.id === activeRoomType)
  const filteredRoomTypeIds = buildRoomTypeSet(filteredRoomTypes)
  const classFilteredRooms = allRooms.filter((room) => filteredRoomTypeIds.has(room.room_type_id))
  const visibleRooms = allRooms.filter((room) =>
    filteredRoomTypeIds.has(room.room_type_id) && roomMatchesStateFilter(room, activeRoomState)
  )
  const roomsByFloor = visibleRooms.reduce(
    (acc, room) => {
      const floor = Number(room.floor ?? 0)
      if (!acc[floor]) acc[floor] = []
      acc[floor].push(room)
      return acc
    },
    {} as Record<number, typeof visibleRooms>
  )
  const sortedFloors = Object.keys(roomsByFloor)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Номерний фонд"
        description={
          activeRoomState === "all"
            ? activeRoomType === "all"
              ? "Керуйте станами номерів, типами номерів і базовими конфігураціями."
              : `Показано тип номера: ${formatRoomTypeName(selectedRoomType?.name)}.`
            : `Показано номери зі станом: ${getRoomStateFilterLabel(activeRoomState)}${activeRoomType !== "all" ? ` · тип: ${formatRoomTypeName(selectedRoomType?.name)}` : ""}.`
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              Усі стани
            </div>
            <Button
              asChild
              variant={activeRoomState === "all" ? "default" : "outline"}
              size="sm"
            >
              <Link href={buildRoomsHref("all", activeRoomType)}>Усі номери</Link>
            </Button>
            <Button
              asChild
              variant={
                activeRoomState === "readiness:ready" ? "default" : "outline"
              }
              size="sm"
              className="ml-1.5"
            >
              <Link href={buildRoomsHref("readiness:ready", activeRoomType)}>
                Готові до заселення
              </Link>
            </Button>
          </div>

          {roomStateFilterGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Button
                    key={item.value}
                    asChild
                    variant={activeRoomState === item.value ? "default" : "outline"}
                    size="sm"
                  >
                    <Link href={buildRoomsHref(item.value, activeRoomType)}>{item.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              Тип номера
            </div>
            <RoomTypeFilter value={activeRoomType} options={roomTypeOptions} />
          </div>
        </div>
      </Card>

      {roomTypeCardsVisibleRoles.has(profile.role) ? (
        <RoomTypeCards roomTypes={filteredRoomTypes} rooms={classFilteredRooms} />
      ) : null}

      <Card>
        <div className="p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Номери за поверхами</h2>
              <p className="text-sm text-muted-foreground">
                {visibleRooms.length} номерів
                {activeRoomState !== "all"
                  ? ` зі станом “${getRoomStateFilterLabel(activeRoomState)}”`
                  : ""}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {sortedFloors.map((floor) => {
              const floorRooms = roomsByFloor[floor].sort((a, b) =>
                String(a.room_number).localeCompare(String(b.room_number), "uk", { numeric: true })
              )
              const readyOnFloor = floorRooms.filter(isRoomStateReadyForCheckIn).length

              return (
                <section key={floor} className="rounded-lg border bg-slate-50/50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Поверх {floor}</h3>
                      <p className="text-xs text-muted-foreground">
                        {floorRooms.length} номерів · {readyOnFloor} готових
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {floorRooms.map((room) => (
                      <div
                        key={room.id}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-lg border bg-white p-3",
                          room.operational_status &&
                            room.operational_status !== "operational" &&
                            "bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(148,163,184,0.12)_8px,rgba(148,163,184,0.12)_16px)]",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold">№ {room.room_number}</div>
                          <div className="truncate text-sm text-muted-foreground">{formatRoomTypeName(room.room_type?.name)}</div>
                        </div>
                        {room.occupancy_status &&
                        room.housekeeping_status &&
                        room.operational_status ? (
                          <div className="flex max-w-[62%] flex-wrap justify-end gap-1">
                            <Badge
                              variant="outline"
                              className={occupancyColors[room.occupancy_status]}
                              title="Проживання"
                            >
                              {formatRoomOccupancyStatus(room.occupancy_status)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={housekeepingColors[room.housekeeping_status]}
                              title="Прибирання"
                            >
                              {formatRoomHousekeepingStatus(room.housekeeping_status)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={operationalColors[room.operational_status]}
                              title="Технічний стан"
                            >
                              {formatRoomOperationalStatus(room.operational_status)}
                            </Badge>
                          </div>
                        ) : (
                          <Badge
                            className="bg-slate-100 text-slate-800"
                          >
                            Дані стану відсутні
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}

            {visibleRooms.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Номерів за цим статусом не знайдено.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
