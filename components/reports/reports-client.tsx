"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth } from "date-fns"
import { uk } from "date-fns/locale"
import { CalendarIcon, Download, Printer, TrendingUp, BedDouble, Users, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

type PeriodPreset = "day" | "week" | "month" | "year" | "custom"

interface ReportsClientProps {
  totalRooms: number
}

const currencyFmt = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 0,
})

const numberFmt = new Intl.NumberFormat("uk-UA")

const STATUS_UK: Record<string, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  checked_in: "Заселено",
  checked_out: "Виселено",
  cancelled: "Скасовано",
  no_show: "Не з'явився",
}

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

function getRangeForPreset(preset: PeriodPreset, anchor: Date): { from: Date; to: Date } {
  switch (preset) {
    case "day":
      return { from: startOfDay(anchor), to: endOfDay(anchor) }
    case "week":
      return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) }
    case "month":
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) }
    case "year":
      return { from: startOfYear(anchor), to: endOfYear(anchor) }
    default:
      return { from: subDays(startOfDay(anchor), 29), to: endOfDay(anchor) }
  }
}

export function ReportsClient({ totalRooms }: ReportsClientProps) {
  const [preset, setPreset] = useState<PeriodPreset>("month")
  const [anchor, setAnchor] = useState<Date>(new Date())
  const [customFrom, setCustomFrom] = useState<Date>(subDays(new Date(), 29))
  const [customTo, setCustomTo] = useState<Date>(new Date())

  const range = useMemo(() => {
    if (preset === "custom") return { from: startOfDay(customFrom), to: endOfDay(customTo) }
    return getRangeForPreset(preset, anchor)
  }, [preset, anchor, customFrom, customTo])

  const fromISO = range.from.toISOString()
  const toISO = range.to.toISOString()

  const { data, isLoading } = useSWR(
    ["reports", fromISO, toISO],
    async () => {
      const supabase = createClient()
      const [payments, reservations] = await Promise.all([
        supabase
          .from("payments")
          .select("amount, created_at, payment_method, transaction_type")
          .gte("created_at", fromISO)
          .lte("created_at", toISO)
          .eq("transaction_type", "payment"),
        supabase
          .from("reservations")
          .select("id, check_in_date, check_out_date, status, total_amount, paid_amount, adults, children")
          .gte("check_in_date", format(range.from, "yyyy-MM-dd"))
          .lte("check_in_date", format(range.to, "yyyy-MM-dd")),
      ])
      return {
        payments: payments.data ?? [],
        reservations: reservations.data ?? [],
      }
    },
    { refreshInterval: 60000 },
  )

  const payments = data?.payments ?? []
  const reservations = data?.reservations ?? []

  // KPIs
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const totalReservations = reservations.length
  const checkedIn = reservations.filter((r) => r.status === "checked_in" || r.status === "checked_out").length
  const cancelled = reservations.filter((r) => r.status === "cancelled" || r.status === "no_show").length
  const avgRate = totalReservations > 0 ? totalRevenue / totalReservations : 0

  const totalNights = reservations
    .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
    .reduce((s, r) => {
      const nights = Math.max(
        1,
        Math.ceil(
          (new Date(r.check_out_date).getTime() - new Date(r.check_in_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
      return s + nights
    }, 0)

  // Occupancy approximation for the period:
  // capacity = totalRooms * days in range; occupancy = soldNights / capacity
  const days = Math.max(
    1,
    Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  )
  const capacity = totalRooms * days
  const occupancyRate = capacity > 0 ? Math.min(100, (totalNights / capacity) * 100) : 0

  // Time series — revenue & reservations by bucket (day or month)
  const timeSeries = useMemo(() => {
    const useMonthBucket = preset === "year" || days > 62
    const buckets = useMonthBucket
      ? eachMonthOfInterval({ start: range.from, end: range.to })
      : eachDayOfInterval({ start: range.from, end: range.to })

    return buckets.map((d) => {
      const label = useMonthBucket ? format(d, "LLL yyyy", { locale: uk }) : format(d, "d MMM", { locale: uk })
      const matchBucket = (date: Date) => (useMonthBucket ? isSameMonth(date, d) : isSameDay(date, d))
      const revenue = payments
        .filter((p) => matchBucket(new Date(p.created_at)))
        .reduce((s, p) => s + Number(p.amount ?? 0), 0)
      const resCount = reservations.filter((r) => matchBucket(new Date(r.check_in_date))).length
      return { label, revenue, reservations: resCount }
    })
  }, [payments, reservations, range.from, range.to, preset, days])

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of reservations) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([status, count]) => ({
      name: STATUS_UK[status] ?? status,
      value: count,
      status,
    }))
  }, [reservations])

  // Payment methods breakdown
  const methodBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      const m = p.payment_method ?? "other"
      map.set(m, (map.get(m) ?? 0) + Number(p.amount ?? 0))
    }
    return Array.from(map.entries()).map(([method, amount]) => ({ name: method, value: amount }))
  }, [payments])

  // CSV export
  function exportCSV() {
    const rows: (string | number)[][] = [
      ["Період", `${format(range.from, "yyyy-MM-dd")} — ${format(range.to, "yyyy-MM-dd")}`],
      [],
      ["Показник", "Значення"],
      ["Дохід", totalRevenue],
      ["Бронювань", totalReservations],
      ["Заселено", checkedIn],
      ["Скасовано", cancelled],
      ["Середній чек", avgRate.toFixed(2)],
      ["Завантаженість, %", occupancyRate.toFixed(2)],
      [],
      ["Період", "Дохід", "Бронювань"],
      ...timeSeries.map((t) => [t.label, t.revenue, t.reservations]),
    ]
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `report_${format(range.from, "yyyy-MM-dd")}_${format(range.to, "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPDF() {
    // Use browser print → user can choose "Save as PDF"
    window.print()
  }

  const rangeLabel = `${format(range.from, "d MMM yyyy", { locale: uk })} — ${format(range.to, "d MMM yyyy", { locale: uk })}`

  return (
    <div className="flex flex-col gap-6 print:gap-3">
      {/* Period filter */}
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Період</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">День</SelectItem>
                <SelectItem value="week">Тиждень</SelectItem>
                <SelectItem value="month">Місяць</SelectItem>
                <SelectItem value="year">Рік</SelectItem>
                <SelectItem value="custom">Власний</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preset !== "custom" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start bg-transparent")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(anchor, "d MMM yyyy", { locale: uk })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={anchor} onSelect={(d) => d && setAnchor(d)} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {preset === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Від</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start bg-transparent")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(customFrom, "d MMM yyyy", { locale: uk })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={(d) => d && setCustomFrom(d)} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">До</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start bg-transparent")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(customTo, "d MMM yyyy", { locale: uk })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={(d) => d && setCustomTo(d)} />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSV / Excel
            </Button>
            <Button variant="outline" onClick={exportPDF}>
              <Printer className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="hidden print:block">
        <h2 className="text-lg font-bold">Звіт за період</h2>
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          label="Дохід"
          value={currencyFmt.format(totalRevenue)}
          sub={rangeLabel}
        />
        <KpiCard
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          label="Бронювань"
          value={numberFmt.format(totalReservations)}
          sub={`${checkedIn} заселено / ${cancelled} скасовано`}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          label="Середній чек"
          value={currencyFmt.format(avgRate)}
          sub="На одне бронювання"
        />
        <KpiCard
          icon={<BedDouble className="h-4 w-4 text-muted-foreground" />}
          label="Завантаженість"
          value={`${occupancyRate.toFixed(1)}%`}
          sub={`${totalNights} з ${capacity} ночей`}
        />
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="print:hidden">
          <TabsTrigger value="revenue">Дохід</TabsTrigger>
          <TabsTrigger value="reservations">Бронювання</TabsTrigger>
          <TabsTrigger value="occupancy">Завантаженість</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Динаміка доходу</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {isLoading ? (
                <LoadingChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => numberFmt.format(v)} />
                    <Tooltip
                      formatter={(v: number) => currencyFmt.format(v)}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={false}
                      name="Дохід"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Способи оплати</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {methodBreakdown.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(e) => `${e.name}: ${currencyFmt.format(e.value as number)}`}
                    >
                      {methodBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => currencyFmt.format(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Кількість бронювань</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {isLoading ? (
                <LoadingChart />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeSeries} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="reservations" fill="var(--chart-2)" name="Бронювань" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Статуси бронювань</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {statusBreakdown.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdown} layout="vertical" margin={{ left: 24, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={12} width={120} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="value" name="Бронювань" radius={[0, 4, 4, 0]}>
                      {statusBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Завантаженість за період</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-6xl font-bold">{occupancyRate.toFixed(1)}%</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {totalNights} проданих ночей з {capacity} можливих
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Номерний фонд</div>
                  <div className="text-3xl font-semibold">{totalRooms}</div>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="text-muted-foreground">Днів у періоді</div>
                  <div className="mt-1 text-2xl font-semibold">{days}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Продано ночей</div>
                  <div className="mt-1 text-2xl font-semibold">{totalNights}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">ADR</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {currencyFmt.format(totalNights > 0 ? totalRevenue / totalNights : 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function LoadingChart() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Завантаження даних...
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Немає даних для обраного періоду
    </div>
  )
}
