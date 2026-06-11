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
    <div className="border-b bg-card/98 shadow-sm">
      <div className="space-y-2 px-3 py-2 md:px-4">
        <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid min-w-0 gap-2 sm:grid-cols-[auto_minmax(10rem,1fr)_auto]">
            <div className="flex min-w-max items-center rounded-md border bg-background shadow-xs">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={onPrev} aria-label="Назад">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-none border-x px-2 text-xs font-medium sm:px-3" onClick={onToday}>
                Сьогодні
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={onNext} aria-label="Вперед">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-sm shadow-xs">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{title}</span>
            </div>

            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && onModeChange(v as ViewMode)}
              size="sm"
              className="w-full justify-self-start rounded-md border bg-background shadow-xs sm:w-auto sm:justify-self-end"
            >
              <ToggleGroupItem value="day" className="h-8 flex-1 px-2 text-xs sm:flex-none">
                {VIEW_MODE_UK.day}
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="h-8 flex-1 px-2 text-xs sm:flex-none">
                {VIEW_MODE_UK.week}
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="h-8 flex-1 px-2 text-xs sm:flex-none">
                {VIEW_MODE_UK.month}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(9rem,1fr)_minmax(8rem,11rem)_auto_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Номер або гість..."
                className="h-8 w-full min-w-0 pl-8"
              />
            </div>

            <Select value={roomTypeFilter} onValueChange={onRoomTypeFilterChange}>
              <SelectTrigger className="h-8 w-full min-w-0 text-xs">
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
              className="h-8 justify-center px-2"
            >
              <Info className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Фільтри</span>
            </Button>

            <Button size="sm" className="h-8 shrink-0 px-2 sm:px-3" onClick={onCreate}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Нове</span>
          </Button>
          </div>
        </div>
      </div>

      {/* KPI-рядок */}
      <div className="hidden grid-cols-2 gap-px bg-border sm:grid sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Завантаженість" value={`${kpi.occupancyRate}%`} accent tone="primary" />
        <KpiTile label="Зайнято / вільно для продажу" value={`${kpi.occupiedRooms} / ${kpi.freeRooms}`} />
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
    <div className={cn("min-w-0 bg-card px-3 py-1.5 sm:px-4", accent && "bg-secondary")}>
      <span className="block truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">{label}</span>
      <span
        className={cn(
          "block truncate text-sm font-semibold tabular-nums sm:text-base",
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
