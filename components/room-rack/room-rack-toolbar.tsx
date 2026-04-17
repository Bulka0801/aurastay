"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Calendar, ChevronLeft, ChevronRight, Info, Plus, Search } from "lucide-react"
import type { RackKpi, ViewMode } from "@/lib/room-rack/types"
import { VIEW_MODE_UK } from "@/lib/i18n/uk"
import { formatFullDate, formatMonthTitle, formatRangeTitle } from "@/lib/room-rack/date-utils"
import { cn } from "@/lib/utils"

interface Props {
  mode: ViewMode
  onModeChange: (v: ViewMode) => void
  anchor: Date
  rangeStart: Date
  rangeEnd: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  search: string
  onSearchChange: (v: string) => void
  roomTypes: { id: string; name: string }[]
  roomTypeFilter: string
  onRoomTypeFilterChange: (v: string) => void
  kpi: RackKpi
  showLegend: boolean
  onToggleLegend: () => void
  onCreate: () => void
}

export function RoomRackToolbar({
  mode,
  onModeChange,
  anchor,
  rangeStart,
  rangeEnd,
  onPrev,
  onNext,
  onToday,
  search,
  onSearchChange,
  roomTypes,
  roomTypeFilter,
  onRoomTypeFilterChange,
  kpi,
  showLegend,
  onToggleLegend,
  onCreate,
}: Props) {
  const title =
    mode === "month" ? formatMonthTitle(anchor) : mode === "week" ? formatRangeTitle(rangeStart, rangeEnd) : formatFullDate(anchor)

  return (
    <div className="border-b bg-card">
      {/* Основний рядок керування */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Шахматка номерів</h1>
            <p className="text-xs text-muted-foreground">Перетягуйте бронювання між номерами і датами</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border bg-background">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none" onClick={onPrev} aria-label="Назад">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 rounded-none border-x px-3 font-medium" onClick={onToday}>
              Сьогодні
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={onNext} aria-label="Вперед">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{title}</span>
          </div>

          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && onModeChange(v as ViewMode)}
            size="sm"
            className="rounded-md border bg-background"
          >
            <ToggleGroupItem value="day" className="text-xs">
              {VIEW_MODE_UK.day}
            </ToggleGroupItem>
            <ToggleGroupItem value="week" className="text-xs">
              {VIEW_MODE_UK.week}
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="text-xs">
              {VIEW_MODE_UK.month}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Номер або гість..."
              className="h-9 w-56 pl-8"
            />
          </div>

          <Select value={roomTypeFilter} onValueChange={onRoomTypeFilterChange}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Тип номера" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі типи номерів</SelectItem>
              {roomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showLegend ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleLegend}
            aria-label="Легенда"
            className="h-9"
          >
            <Info className="mr-2 h-4 w-4" />
            Легенда
          </Button>

          <Button size="sm" className="h-9" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Нове бронювання
          </Button>
        </div>
      </div>

      {/* KPI-рядок */}
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4 lg:grid-cols-6">
        <KpiTile label="Завантаженість" value={`${kpi.occupancyRate}%`} accent tone="primary" />
        <KpiTile label="Зайнято / вільно" value={`${kpi.occupiedRooms} / ${kpi.freeRooms}`} />
        <KpiTile label="Всього номерів" value={kpi.totalRooms} />
        <KpiTile label="Заїзди сьогодні" value={kpi.arrivalsToday} tone="success" />
        <KpiTile label="Виїзди сьогодні" value={kpi.departuresToday} tone="warning" />
        <KpiTile label="Очікують передплату" value={kpi.pendingConfirm} tone="muted" />
      </div>
    </div>
  )
}

function KpiTile({
  label,
  value,
  accent,
  tone,
}: {
  label: string
  value: string | number
  accent?: boolean
  tone?: "primary" | "success" | "warning" | "muted"
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 bg-card px-4 py-2.5", accent && "bg-secondary")}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "success" && "text-emerald-600",
          tone === "warning" && "text-amber-600",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  )
}
