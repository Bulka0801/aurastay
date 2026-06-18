"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClipboardList,
  DoorOpen,
  Filter,
  Loader2,
  MoreHorizontal,
  PackagePlus,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Timer,
  UserRound,
  Wrench,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import {
  DashboardMetricCard,
  DashboardPageHeader,
} from "@/components/dashboards/dashboard-primitives"
import {
  formatDateTime,
  formatMaintenanceStatus,
  formatPriority,
  formatRoomOperationalStatus,
} from "@/lib/localization"
import { cn } from "@/lib/utils"
import type { MaintenancePriority, MaintenanceStatus, Profile } from "@/lib/types"

type DashboardRequest = {
  id: string
  request_number: string | null
  room_id: string | null
  description: string
  category: string | null
  priority: MaintenancePriority
  status: MaintenanceStatus
  resolution: string | null
  assigned_to: string | null
  reported_by: string | null
  reported_at: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  rooms: {
    id?: string
    room_number: string
    floor: number
    operational_status?: string
  } | null
  assigned_profile: { id: string; first_name: string; last_name: string } | null
  reporter: { first_name: string; last_name: string; role?: string } | null
}

type DashboardRoom = {
  id: string
  room_number: string
  floor: number
  operational_status: string
}

type StaffMember = {
  id: string
  first_name: string
  last_name: string
  role: string
}

type SortMode = "priority" | "due" | "created" | "room"

const categoryLabels: Record<string, string> = {
  plumbing: "Сантехніка",
  electrical: "Електрика",
  hvac: "ОВіК",
  lighting: "Освітлення",
  door_lock: "Двері / замки",
  structural: "Конструкції",
  general: "Загальне",
}

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const statusClass: Record<string, string> = {
  pending: "border-slate-300 bg-slate-100 text-slate-700",
  assigned: "border-blue-300 bg-blue-50 text-blue-700",
  in_progress: "border-indigo-300 bg-indigo-50 text-indigo-700",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-500",
}

const priorityClass: Record<string, string> = {
  urgent: "border-red-300 bg-red-600 text-white",
  high: "border-orange-300 bg-orange-50 text-orange-700",
  normal: "border-blue-300 bg-blue-50 text-blue-700",
  low: "border-slate-300 bg-slate-100 text-slate-700",
}

const priorityBorderClass: Record<string, string> = {
  urgent: "border-l-red-600",
  high: "border-l-orange-500",
  normal: "border-l-blue-400",
  low: "border-l-slate-300",
}

const slaHours: Record<string, number> = {
  urgent: 1,
  high: 4,
  normal: 24,
  low: 72,
}

async function fetchMaintenanceDashboard() {
  const supabase = createClient()

  const [requestsRes, roomsRes, staffRes] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select(
        `*, rooms(id, room_number, floor, operational_status), assigned_profile:profiles!maintenance_requests_assigned_to_fkey(id, first_name, last_name), reporter:profiles!maintenance_requests_reported_by_fkey(first_name, last_name, role)`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("rooms")
      .select("id, room_number, floor, operational_status")
      .order("room_number"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, role")
      .in("role", ["maintenance_staff", "maintenance_manager"])
      .eq("is_active", true)
      .order("first_name"),
  ])

  return {
    requests: (requestsRes.data || []) as DashboardRequest[],
    rooms: (roomsRes.data || []) as DashboardRoom[],
    staff: (staffRes.data || []) as StaffMember[],
  }
}

function getDueAt(request: DashboardRequest) {
  const created = new Date(request.reported_at || request.created_at)
  return new Date(created.getTime() + (slaHours[request.priority] || 24) * 60 * 60 * 1000)
}

function isActive(request: DashboardRequest) {
  return request.status !== "completed" && request.status !== "cancelled"
}

function isOverdue(request: DashboardRequest) {
  return isActive(request) && getDueAt(request).getTime() < Date.now()
}

function shortDateTime(date: Date | string | null | undefined) {
  if (!date) return "—"
  const value = typeof date === "string" ? new Date(date) : date
  return value.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(diff) || diff < 0) return null
  return Math.round(diff / 60000)
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return "—"
  if (minutes < 60) return `${minutes} хв`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} год ${rest} хв` : `${hours} год`
}

function technicianName(request: DashboardRequest) {
  if (!request.assigned_profile) return "Не призначено"
  return `${request.assigned_profile.first_name} ${request.assigned_profile.last_name}`
}

function roomLabel(request: DashboardRequest) {
  return request.rooms ? `№ ${request.rooms.room_number}` : "Без номера"
}

export function MaintenanceDashboard({ profile }: { profile: Profile }) {
  const { data, mutate, isLoading } = useSWR("maintenance-dashboard", fetchMaintenanceDashboard, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })

  const requests = data?.requests || []
  const rooms = data?.rooms || []
  const staff = data?.staff || []
  const isManager =
    profile.role === "maintenance_staff" || profile.role === "general_manager" || profile.role === "system_administrator"

  const [search, setSearch] = useState("")
  const [scope, setScope] = useState(isManager ? "all" : "mine")
  const [statusFilter, setStatusFilter] = useState("active")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sortMode, setSortMode] = useState<SortMode>("priority")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<MaintenanceStatus>("in_progress")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailsRequest, setDetailsRequest] = useState<DashboardRequest | null>(null)

  const [newOpen, setNewOpen] = useState(false)
  const [newRoomId, setNewRoomId] = useState("none")
  const [newCategory, setNewCategory] = useState("general")
  const [newPriority, setNewPriority] = useState<MaintenancePriority>("normal")
  const [newDescription, setNewDescription] = useState("")

  const [scanOpen, setScanOpen] = useState(false)
  const [scanValue, setScanValue] = useState("")
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [releaseRoomId, setReleaseRoomId] = useState("")
  const [partsOpen, setPartsOpen] = useState(false)
  const [partsNote, setPartsNote] = useState("")

  const activeRequests = requests.filter(isActive)
  const myRequests = activeRequests.filter((request) => request.assigned_to === profile.id)
  const criticalRequests = activeRequests.filter((request) => request.priority === "urgent" || request.priority === "high")
  const overdueRequests = activeRequests.filter(isOverdue)
  const completedToday = requests.filter(
    (request) =>
      request.status === "completed" &&
      request.completed_at &&
      new Date(request.completed_at).toDateString() === new Date().toDateString()
  )
  const recentlyAssigned = activeRequests
    .filter((request) => request.assigned_to === profile.id || isManager)
    .sort((a, b) => new Date(b.assigned_at || b.created_at).getTime() - new Date(a.assigned_at || a.created_at).getTime())

  const avgResolutionMinutes = useMemo(() => {
    const durations = completedToday
      .map((request) => minutesBetween(request.started_at || request.created_at, request.completed_at))
      .filter((value): value is number => value !== null)
    if (!durations.length) return null
    return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
  }, [completedToday])

  const statusCounts = {
    pending: activeRequests.filter((request) => request.status === "pending").length,
    in_progress: activeRequests.filter((request) => request.status === "in_progress").length,
    completed: completedToday.length,
  }

  const roomStatusCounts = {
    maintenance: rooms.filter((room) => room.operational_status === "maintenance").length,
    blocked: rooms.filter((room) => room.operational_status === "blocked").length,
    out_of_order: rooms.filter((room) => room.operational_status === "out_of_order").length,
    available: rooms.filter((room) => room.operational_status === "operational").length,
  }

  const roomBlockingRequests = activeRequests.filter(
    (request) =>
      request.rooms &&
      request.rooms.operational_status !== "operational"
  )

  const filteredTasks = useMemo(() => {
    return activeRequests
      .filter((request) => {
        if (scope === "mine" && request.assigned_to !== profile.id) return false
        if (scope === "unassigned" && request.assigned_to) return false
        if (scope === "critical" && request.priority !== "urgent" && request.priority !== "high") return false
        if (scope === "overdue" && !isOverdue(request)) return false
        if (statusFilter !== "active" && request.status !== statusFilter) return false
        if (priorityFilter !== "all" && request.priority !== priorityFilter) return false
        if (!search) return true

        const haystack = [
          request.request_number,
          request.description,
          request.category,
          request.rooms?.room_number,
          request.rooms?.floor ? `поверх ${request.rooms.floor}` : null,
          technicianName(request),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return haystack.includes(search.toLowerCase())
      })
      .sort((a, b) => {
        if (sortMode === "due") return getDueAt(a).getTime() - getDueAt(b).getTime()
        if (sortMode === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (sortMode === "room") return (a.rooms?.room_number || "9999").localeCompare(b.rooms?.room_number || "9999")
        return (priorityRank[a.priority] ?? 4) - (priorityRank[b.priority] ?? 4) || getDueAt(a).getTime() - getDueAt(b).getTime()
      })
  }, [activeRequests, priorityFilter, profile.id, scope, search, sortMode, statusFilter])

  const allVisibleSelected = filteredTasks.length > 0 && filteredTasks.every((request) => selectedIds.has(request.id))
  const selectedRequests = filteredTasks.filter((request) => selectedIds.has(request.id))

  const handleStatusChange = async (request: DashboardRequest, status: MaintenanceStatus, resolution?: string) => {
    setUpdatingId(request.id)
    const supabase = createClient()
    const now = new Date().toISOString()
    const updateData: Record<string, string | null> = {
      status,
      updated_at: now,
    }

    if (status === "in_progress") {
      updateData.started_at = request.started_at || now
      updateData.assigned_to = request.assigned_to || profile.id
      updateData.assigned_at = request.assigned_at || now
    }

    if (status === "completed") {
      updateData.completed_at = now
      updateData.resolution = resolution || request.resolution || "Роботу виконано"
    }

    await supabase.from("maintenance_requests").update(updateData).eq("id", request.id)
    setUpdatingId(null)
    setSelectedIds(new Set())
    mutate()
  }

  const handleBulkUpdate = async () => {
    if (!selectedRequests.length) return
    setSaving(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    const updateData: Record<string, string | null> = { status: bulkStatus, updated_at: now }

    if (bulkStatus === "in_progress") {
      updateData.started_at = now
      updateData.assigned_to = profile.id
      updateData.assigned_at = now
    }

    if (bulkStatus === "completed") {
      updateData.completed_at = now
      updateData.resolution = "Масово позначено як виконано"
    }

    await supabase.from("maintenance_requests").update(updateData).in("id", selectedRequests.map((request) => request.id))
    setSaving(false)
    setSelectedIds(new Set())
    mutate()
  }

  const handleCreate = async () => {
    if (!newDescription.trim()) return
    setSaving(true)
    const supabase = createClient()
    const roomId = newRoomId === "none" ? null : newRoomId
    const reqNum = `MR-${Date.now().toString(36).toUpperCase()}`

    await supabase.from("maintenance_requests").insert({
      request_number: reqNum,
      room_id: roomId,
      description: newDescription.trim(),
      category: newCategory,
      priority: newPriority,
      status: "in_progress",
      assigned_to: profile.id,
      assigned_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      reported_by: profile.id,
      reported_at: new Date().toISOString(),
    })


    setSaving(false)
    setNewOpen(false)
    setNewRoomId("none")
    setNewCategory("general")
    setNewPriority("normal")
    setNewDescription("")
    mutate()
  }

  const handleReleaseRoom = async () => {
    if (!releaseRoomId) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from("rooms")
      .update({ operational_status: "operational" })
      .eq("id", releaseRoomId)
    setSaving(false)
    setReleaseOpen(false)
    setReleaseRoomId("")
    mutate()
  }

  const handleEscalate = async (request: DashboardRequest) => {
    setUpdatingId(request.id)
    const supabase = createClient()
    await supabase
      .from("maintenance_requests")
      .update({ priority: "urgent", updated_at: new Date().toISOString() })
      .eq("id", request.id)
    setUpdatingId(null)
    mutate()
  }

  const handleScan = () => {
    const value = scanValue.trim()
    if (!value) return
    setSearch(value.replace(/^room[:-]?/i, ""))
    setScope("all")
    setScanOpen(false)
    setScanValue("")
  }

  const notifications = [
    ...criticalRequests.slice(0, 2).map((request) => ({
      tone: "critical",
      label: `${roomLabel(request)}: критична заявка потребує дії`,
      request,
    })),
    ...overdueRequests.slice(0, 2).map((request) => ({
      tone: "overdue",
      label: `${roomLabel(request)} прострочено: термін ${shortDateTime(getDueAt(request))}`,
      request,
    })),
    ...roomBlockingRequests.slice(0, 2).map((request) => ({
      tone: "room",
      label: `${roomLabel(request)} не можна продавати до завершення ремонту`,
      request,
    })),
  ].slice(0, 5)

  return (
      <div className="flex flex-col gap-5">
      <DashboardPageHeader
        title="Дашборд технічної служби"
        description={`Пріоритетні заявки, ремонти номерів і швидкі оновлення статусів для ${profile.first_name}.`}
        actions={
          <>
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Оновити
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Нова заявка
          </Button>
          </>
        }
      />

      <section aria-label="Ключові показники технічної служби" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DashboardMetricCard title="Відкриті заявки" value={activeRequests.length} icon={ClipboardList} tone="blue" description="У роботі або очікують" href="/dashboard/maintenance" />
        <DashboardMetricCard title="Критичні" value={criticalRequests.length} icon={ShieldAlert} tone="red" description="Гість / безпека" href="/dashboard/maintenance" />
        <DashboardMetricCard title="Прострочені" value={overdueRequests.length} icon={Timer} tone="amber" description="Порушення SLA" href="/dashboard/maintenance" />
        <DashboardMetricCard title="Виконано сьогодні" value={completedToday.length} icon={CheckCircle2} tone="emerald" description="Закрито за зміну" href="/dashboard/maintenance" />
        <DashboardMetricCard title="Сер. час рішення" value={formatDuration(avgResolutionMinutes)} icon={Clock} tone="slate" description="За сьогодні" />
        <DashboardMetricCard title="Активні мої" value={myRequests.length} icon={Wrench} tone="indigo" description="Призначено вам" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <PriorityPanel
          title="Критичні інциденти"
          icon={AlertTriangle}
          empty="Критичних інцидентів немає"
          requests={criticalRequests}
          tone="critical"
          onOpenDetails={setDetailsRequest}
          onStart={(request) => handleStatusChange(request, "in_progress")}
        />
        <PriorityPanel
          title="Прострочені задачі"
          icon={Timer}
          empty="Немає прострочених задач"
          requests={overdueRequests}
          tone="overdue"
          onOpenDetails={setDetailsRequest}
          onStart={(request) => handleStatusChange(request, "in_progress")}
        />
        <PriorityPanel
          title="Нещодавно призначені"
          icon={Bell}
          empty="Нових призначень немає"
          requests={recentlyAssigned}
          tone="recent"
          onOpenDetails={setDetailsRequest}
          onStart={(request) => handleStatusChange(request, "in_progress")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Огляд статусів задач</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusProgress
                label="Очікують"
                value={statusCounts.pending}
                total={activeRequests.length}
                indicatorClassName="[&_[data-slot=progress-indicator]]:bg-slate-500"
              />
              <StatusProgress
                label="У процесі"
                value={statusCounts.in_progress}
                total={activeRequests.length}
                indicatorClassName="[&_[data-slot=progress-indicator]]:bg-indigo-500"
              />
              <StatusProgress
                label="Виконано сьогодні"
                value={statusCounts.completed}
                total={activeRequests.length + completedToday.length}
                indicatorClassName="[&_[data-slot=progress-indicator]]:bg-emerald-500"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Статус ремонтів номерів</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <RoomCount label="У ремонті" value={roomStatusCounts.maintenance} />
                <RoomCount label="Заблоковані" value={roomStatusCounts.blocked + roomStatusCounts.out_of_order} />
                <RoomCount label="Доступні" value={roomStatusCounts.available} />
                <RoomCount label="Блокують продаж" value={roomBlockingRequests.length} />
              </div>
              <Separator />
              <div className="space-y-2">
                {roomBlockingRequests.slice(0, 5).map((request) => (
                  <button
                    key={request.id}
                    className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setDetailsRequest(request)}
                  >
                    <span className="font-medium">{roomLabel(request)}</span>
                    <span className="truncate text-muted-foreground">{request.description}</span>
                    <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                  </button>
                ))}
                {roomBlockingRequests.length === 0 && <p className="text-sm text-muted-foreground">Немає ремонтів, що блокують номерний фонд.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Сповіщення</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.map((notification, index) => (
                <button
                  key={`${notification.request.id}-${notification.tone}-${index}`}
                  onClick={() => setDetailsRequest(notification.request)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md border p-3 text-left text-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    notification.tone === "critical" && "border-red-200 bg-red-50 text-red-800",
                    notification.tone === "overdue" && "border-amber-200 bg-amber-50 text-amber-800",
                    notification.tone === "room" && "border-blue-200 bg-blue-50 text-blue-800"
                  )}
                >
                  <Bell className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{notification.label}</span>
                </button>
              ))}
              {notifications.length === 0 && <p className="text-sm text-muted-foreground">Немає термінових сповіщень.</p>}
            </CardContent>
          </Card>
      </div>

      <Dialog open={Boolean(detailsRequest)} onOpenChange={(open) => !open && setDetailsRequest(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Деталі заявки {detailsRequest?.request_number || detailsRequest?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>Повна інформація для координації з рецепцією та господарською службою.</DialogDescription>
          </DialogHeader>
          {detailsRequest && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{categoryLabels[detailsRequest.category || "general"] || detailsRequest.category}</Badge>
                <PriorityBadge priority={detailsRequest.priority} />
                <StatusBadge status={detailsRequest.status} />
                {isOverdue(detailsRequest) && <Badge className="bg-amber-600 text-white">Прострочено</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Номер / локація" value={detailsRequest.rooms ? `№ ${detailsRequest.rooms.room_number}, поверх ${detailsRequest.rooms.floor}` : "Без номера"} />
                <Detail label="Виконавець" value={technicianName(detailsRequest)} />
                <Detail label="Створено" value={formatDateTime(detailsRequest.created_at)} />
                <Detail label="Термін виконання" value={shortDateTime(getDueAt(detailsRequest))} />
                <Detail
                  label="Технічний стан номера"
                  value={formatRoomOperationalStatus(
                    detailsRequest.rooms?.operational_status,
                  )}
                />
                <Detail
                  label="Повідомив(ла)"
                  value={
                    detailsRequest.reporter
                      ? `${detailsRequest.reporter.first_name} ${detailsRequest.reporter.last_name}`
                      : "—"
                  }
                />
              </div>
              <div className="rounded-md border bg-slate-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Опис проблеми</p>
                <p className="text-sm">{detailsRequest.description}</p>
              </div>
              {detailsRequest.resolution && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <p className="mb-1 text-xs font-semibold uppercase">Звіт про виконання</p>
                  <p className="text-sm">{detailsRequest.resolution}</p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsRequest(null)}>
                  Закрити
                </Button>
                {detailsRequest.status === "pending" && (
                  <Button onClick={() => handleStatusChange(detailsRequest, "in_progress")}>Почати роботу</Button>
                )}
                {detailsRequest.status === "in_progress" && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange(detailsRequest, "completed")}>
                    Позначити виконаною
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Нова технічна заявка</DialogTitle>
            <DialogDescription>Для проблеми, знайденої під час обходу або отриманої від іншого відділу.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-room">Номер</Label>
                <Select value={newRoomId} onValueChange={setNewRoomId}>
                  <SelectTrigger id="new-room">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без номера</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        № {room.room_number}, поверх {room.floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-priority">Пріоритет</Label>
                <Select value={newPriority} onValueChange={(value) => setNewPriority(value as MaintenancePriority)}>
                  <SelectTrigger id="new-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">{formatPriority("urgent")}</SelectItem>
                    <SelectItem value="high">{formatPriority("high")}</SelectItem>
                    <SelectItem value="normal">{formatPriority("normal")}</SelectItem>
                    <SelectItem value="low">{formatPriority("low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category">Категорія</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger id="new-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Опис проблеми</Label>
              <Textarea
                id="new-description"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Наприклад: кондиціонер не охолоджує, гість у номері."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newDescription.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити і почати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сканування номера або активу</DialogTitle>
            <DialogDescription>Введіть або вставте код з QR. Заявки будуть відфільтровані за цим кодом.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scan-value">Код / номер</Label>
            <Input id="scan-value" value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="Наприклад: 412 або ROOM-412" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleScan}>Знайти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Повернути номер у продаж</DialogTitle>
            <DialogDescription>Використовуйте після ремонту та перевірки, щоб рецепція бачила номер доступним.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="release-room">Номер</Label>
            <Select value={releaseRoomId} onValueChange={setReleaseRoomId}>
              <SelectTrigger id="release-room">
                <SelectValue placeholder="Оберіть номер" />
              </SelectTrigger>
              <SelectContent>
                {rooms
                  .filter((room) => room.operational_status !== "operational")
                  .map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      № {room.room_number} ·{" "}
                      {formatRoomOperationalStatus(room.operational_status)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleReleaseRoom} disabled={saving || !releaseRoomId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Повернути
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={partsOpen} onOpenChange={setPartsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запит запчастин</DialogTitle>
            <DialogDescription>Швидка нотатка для керівника технічної служби або складу.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="parts-note">Що потрібно</Label>
            <Textarea id="parts-note" value={partsNote} onChange={(event) => setPartsNote(event.target.value)} rows={4} placeholder="Наприклад: фільтр кондиціонера для номера 412." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartsOpen(false)}>
              Скасувати
            </Button>
            <Button
              onClick={() => {
                setPartsNote("")
                setPartsOpen(false)
              }}
              disabled={!partsNote.trim()}
            >
              Зберегти запит
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string
  value: string | number
  detail: string
  icon: typeof Wrench
  tone: "blue" | "red" | "amber" | "green" | "slate" | "indigo"
}) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className={cn("rounded-md border p-2", tones[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityPanel({
  title,
  icon: Icon,
  requests,
  empty,
  tone,
  onOpenDetails,
  onStart,
}: {
  title: string
  icon: typeof Wrench
  requests: DashboardRequest[]
  empty: string
  tone: "critical" | "overdue" | "recent"
  onOpenDetails: (request: DashboardRequest) => void
  onStart: (request: DashboardRequest) => void
}) {
  return (
    <Card className={cn(tone === "critical" && "border-red-200", tone === "overdue" && "border-amber-200")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={cn("h-4 w-4", tone === "critical" && "text-red-600", tone === "overdue" && "text-amber-600")} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[22rem] space-y-2 overflow-y-auto pr-2">
        {requests.map((request) => (
          <div key={request.id} className={cn("rounded-md border-l-4 bg-white p-3 shadow-sm", priorityBorderClass[request.priority])}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{roomLabel(request)}</span>
                  <PriorityBadge priority={request.priority} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">Термін: {shortDateTime(getDueAt(request))}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Дії із заявкою">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenDetails(request)}>Деталі</DropdownMenuItem>
                  {request.status === "pending" && <DropdownMenuItem onClick={() => onStart(request)}>Почати роботу</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {requests.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  )
}

function TaskRow({
  request,
  selected,
  updating,
  onSelect,
  onDetails,
  onStart,
  onComplete,
  onEscalate,
}: {
  request: DashboardRequest
  selected: boolean
  updating: boolean
  onSelect: (checked: boolean) => void
  onDetails: () => void
  onStart: () => void
  onComplete: () => void
  onEscalate: () => void
}) {
  return (
    <TableRow className={cn("border-l-4", priorityBorderClass[request.priority], isOverdue(request) && "bg-amber-50/40")}>
      <TableCell>
        <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(Boolean(checked))} aria-label={`Вибрати заявку ${request.request_number || request.id}`} />
      </TableCell>
      <TableCell>
        <button className="font-semibold text-slate-950 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onDetails}>
          {roomLabel(request)}
        </button>
        {request.rooms && <p className="text-xs text-muted-foreground">Поверх {request.rooms.floor}</p>}
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal">
        <p className="font-medium text-slate-900">{categoryLabels[request.category || "general"] || request.category || "Загальне"}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{request.description}</p>
      </TableCell>
      <TableCell>
        <PriorityBadge priority={request.priority} />
      </TableCell>
      <TableCell>
        <StatusBadge status={request.status} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <span>{technicianName(request)}</span>
        </div>
      </TableCell>
      <TableCell>{shortDateTime(request.created_at)}</TableCell>
      <TableCell>
        <span className={cn(isOverdue(request) && "font-semibold text-amber-700")}>{shortDateTime(getDueAt(request))}</span>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          {request.status === "pending" && (
            <Button size="sm" onClick={onStart} disabled={updating}>
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Почати
            </Button>
          )}
          {request.status === "in_progress" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onComplete} disabled={updating}>
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Виконано
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Додаткові дії">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Дії</DropdownMenuLabel>
              <DropdownMenuItem onClick={onDetails}>Деталі</DropdownMenuItem>
              <DropdownMenuItem onClick={onEscalate}>Ескалювати</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Повідомити рецепцію</DropdownMenuItem>
              <DropdownMenuItem disabled>Повідомити господарську службу</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

function TaskCard({
  request,
  updating,
  onDetails,
  onStart,
  onComplete,
  onEscalate,
}: {
  request: DashboardRequest
  updating: boolean
  onDetails: () => void
  onStart: () => void
  onComplete: () => void
  onEscalate: () => void
}) {
  return (
    <Card className={cn("border-l-4", priorityBorderClass[request.priority], isOverdue(request) && "bg-amber-50/40")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold">{roomLabel(request)}</span>
              <PriorityBadge priority={request.priority} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Термін: {shortDateTime(getDueAt(request))}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
        <p className="text-sm font-medium">{request.description}</p>
        <div className="flex gap-2">
          {request.status === "pending" && (
            <Button className="min-h-11 flex-1" onClick={onStart} disabled={updating}>
              Почати
            </Button>
          )}
          {request.status === "in_progress" && (
            <Button className="min-h-11 flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={onComplete} disabled={updating}>
              Виконано
            </Button>
          )}
          <Button className="min-h-11" variant="outline" onClick={onDetails}>
            Деталі
          </Button>
          <Button className="min-h-11" variant="outline" size="icon" onClick={onEscalate} aria-label="Ескалювати заявку">
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  return <Badge className={cn("border text-xs", priorityClass[priority] || priorityClass.normal)}>{formatPriority(priority)}</Badge>
}

function StatusBadge({ status }: { status: string }) {
  return <Badge className={cn("border text-xs", statusClass[status] || statusClass.pending)}>{formatMaintenanceStatus(status)}</Badge>
}

function StatusProgress({
  label,
  value,
  total,
  indicatorClassName,
}: {
  label: string
  value: number
  total: number
  indicatorClassName: string
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <Progress value={percent} className={cn("h-2 bg-slate-100", indicatorClassName)} />
    </div>
  )
}

function RoomCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-2">
      <p className="text-xl font-bold text-slate-950">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function QuickActions({
  onNew,
  onScan,
  onRelease,
  onParts,
}: {
  onNew: () => void
  onScan: () => void
  onRelease: () => void
  onParts: () => void
}) {
  const actions = [
    { label: "Нова заявка", icon: Plus, onClick: onNew },
    { label: "Сканувати", icon: QrCode, onClick: onScan },
    { label: "Повернути номер", icon: DoorOpen, onClick: onRelease },
    { label: "Запит запчастин", icon: PackagePlus, onClick: onParts },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Швидкі дії</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button key={action.label} variant="outline" className="h-auto min-h-16 flex-col gap-2 whitespace-normal px-2 py-3 text-center" onClick={action.onClick}>
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium leading-tight">{action.label}</span>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}
