"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { formatMaintenanceStatus, formatPriority } from "@/lib/localization"
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  UserPlus,
  XCircle,
  Zap,
  Droplets,
  Thermometer,
  Lightbulb,
  DoorOpen,
  HardHat,
  ArrowRight,
} from "lucide-react"
import type { Profile } from "@/lib/types"
import useSWR from "swr"

interface MaintRequest {
  id: string
  request_number: string | null
  room_id: string | null
  description: string
  category: string
  priority: string
  status: string
  resolution: string | null
  assigned_to: string | null
  reported_by: string | null
  reported_at: string | null
  assigned_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  rooms: { room_number: string; floor: number } | null
  assigned_profile: { id: string; first_name: string; last_name: string } | null
  reporter: { first_name: string; last_name: string } | null
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  role: string
}

const categoryConfig: Record<string, { label: string; icon: typeof Wrench; color: string }> = {
  plumbing: { label: "Сантехніка", icon: Droplets, color: "text-blue-600" },
  electrical: { label: "Електрика", icon: Zap, color: "text-amber-600" },
  hvac: { label: "ОВіК / клімат", icon: Thermometer, color: "text-sky-600" },
  lighting: { label: "Освітлення", icon: Lightbulb, color: "text-yellow-600" },
  door_lock: { label: "Двері / замок", icon: DoorOpen, color: "text-slate-600" },
  structural: { label: "Будівельне", icon: HardHat, color: "text-orange-600" },
  general: { label: "Загальне", icon: Wrench, color: "text-gray-600" },
}

const priorityConfig: Record<string, { class: string; border: string }> = {
  urgent: { class: "bg-red-600 text-white", border: "border-l-red-600" },
  high: { class: "bg-red-100 text-red-800", border: "border-l-red-400" },
  medium: { class: "bg-amber-100 text-amber-800", border: "border-l-amber-400" },
  low: { class: "bg-sky-100 text-sky-800", border: "border-l-sky-400" },
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-50" },
  in_progress: { color: "text-blue-700", bg: "bg-blue-50" },
  completed: { color: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled: { color: "text-gray-500", bg: "bg-gray-50" },
}

function pluralRequests(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return "заявка"
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "заявки"
  return "заявок"
}

async function fetchRequests() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select(
      `*, rooms(room_number, floor), assigned_profile:profiles!maintenance_requests_assigned_to_fkey(id, first_name, last_name), reporter:profiles!maintenance_requests_reported_by_fkey(first_name, last_name)`
    )
    .order("created_at", { ascending: false })
  if (error) console.log("[v0] fetchRequests error:", error)
  return (data || []) as MaintRequest[]
}

export function MaintenanceClient({
  profile,
  initialRooms,
  initialStaff,
}: {
  profile: Profile
  initialRooms: { id: string; room_number: string; floor: number }[]
  initialStaff: StaffMember[]
}) {
  const { data: requests, mutate, isLoading } = useSWR("maint-requests", fetchRequests, {
    refreshInterval: 15000,
  })

  const isManager =
    profile.role === "maintenance_manager" || profile.role === "system_admin" || profile.role === "general_manager"

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // New request dialog
  const [newOpen, setNewOpen] = useState(false)
  const [newCategory, setNewCategory] = useState("general")
  const [newDesc, setNewDesc] = useState("")
  const [newRoomId, setNewRoomId] = useState("")
  const [newPriority, setNewPriority] = useState("medium")
  const [newStaff, setNewStaff] = useState("")
  const [saving, setSaving] = useState(false)

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignReq, setAssignReq] = useState<MaintRequest | null>(null)
  const [assignStaff, setAssignStaff] = useState("")

  // Resolve dialog
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveReq, setResolveReq] = useState<MaintRequest | null>(null)
  const [resolution, setResolution] = useState("")

  const allRequests = requests || []

  const filteredRequests = allRequests.filter((r) => {
    if (statusFilter === "active" && (r.status === "completed" || r.status === "cancelled")) return false
    if (statusFilter !== "active" && statusFilter !== "all" && r.status !== statusFilter) return false
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false
    if (
      search &&
      !r.description.toLowerCase().includes(search.toLowerCase()) &&
      !r.rooms?.room_number?.toLowerCase().includes(search.toLowerCase()) &&
      !r.request_number?.toLowerCase().includes(search.toLowerCase()) &&
      !r.category.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  const pendingCount = allRequests.filter((r) => r.status === "pending").length
  const inProgressCount = allRequests.filter((r) => r.status === "in_progress").length
  const completedTodayCount = allRequests.filter(
    (r) => r.status === "completed" && r.completed_at && new Date(r.completed_at).toDateString() === new Date().toDateString()
  ).length
  const urgentCount = allRequests.filter(
    (r) => (r.priority === "urgent" || r.priority === "high") && r.status !== "completed" && r.status !== "cancelled"
  ).length

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    const supabase = createClient()
    const updateData: Record<string, string | null> = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === "in_progress") {
      updateData.started_at = new Date().toISOString()
      const req = allRequests.find((r) => r.id === id)
      if (!req?.assigned_to) {
        updateData.assigned_to = profile.id
        updateData.assigned_at = new Date().toISOString()
      }
    }
    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString()
      const req = allRequests.find((r) => r.id === id)
      if (req?.room_id) {
        await supabase.from("rooms").update({ status: "available" }).eq("id", req.room_id)
      }
    }
    await supabase.from("maintenance_requests").update(updateData).eq("id", id)
    setUpdatingId(null)
    mutate()
  }

  const handleResolve = async () => {
    if (!resolveReq) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from("maintenance_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        resolution: resolution || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolveReq.id)
    if (resolveReq.room_id) {
      await supabase.from("rooms").update({ status: "available" }).eq("id", resolveReq.room_id)
    }
    setSaving(false)
    setResolveOpen(false)
    setResolveReq(null)
    setResolution("")
    mutate()
  }

  const handleCreate = async () => {
    if (!newDesc.trim()) return
    setSaving(true)
    const supabase = createClient()
    const staffId = newStaff === "none" || !newStaff ? null : newStaff
    const roomId = newRoomId === "none" || !newRoomId ? null : newRoomId
    const reqNum = `MR-${Date.now().toString(36).toUpperCase()}`
    await supabase.from("maintenance_requests").insert({
      request_number: reqNum,
      room_id: roomId,
      description: newDesc,
      category: newCategory,
      priority: newPriority,
      status: staffId ? "in_progress" : "pending",
      assigned_to: staffId,
      assigned_at: staffId ? new Date().toISOString() : null,
      reported_by: profile.id,
      reported_at: new Date().toISOString(),
    })
    if (roomId) {
      await supabase.from("rooms").update({ status: "maintenance" }).eq("id", roomId)
    }
    setSaving(false)
    setNewOpen(false)
    setNewDesc("")
    setNewCategory("general")
    setNewRoomId("")
    setNewPriority("medium")
    setNewStaff("")
    mutate()
  }

  const handleAssign = async () => {
    if (!assignReq || !assignStaff) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from("maintenance_requests")
      .update({
        assigned_to: assignStaff,
        assigned_at: new Date().toISOString(),
        status: "in_progress",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignReq.id)
    setSaving(false)
    setAssignOpen(false)
    setAssignReq(null)
    setAssignStaff("")
    mutate()
  }

  const activeTotal = pendingCount + inProgressCount
  const resolveRate = activeTotal + completedTodayCount > 0 
    ? Math.round((completedTodayCount / (activeTotal + completedTodayCount)) * 100) 
    : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Технічні заявки</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("uk-UA", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Оновити
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Нова заявка
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              <p className="text-xs font-medium text-amber-600">{formatMaintenanceStatus("pending")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{inProgressCount}</p>
              <p className="text-xs font-medium text-blue-600">{formatMaintenanceStatus("in_progress")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{completedTodayCount}</p>
              <p className="text-xs font-medium text-emerald-600">Закрито сьогодні</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${urgentCount > 0 ? "border-l-red-500 bg-red-50/40" : "border-l-slate-300"}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${urgentCount > 0 ? "bg-red-100" : "bg-slate-100"}`}>
              <AlertTriangle className={`h-5 w-5 ${urgentCount > 0 ? "text-red-600" : "text-slate-400"}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${urgentCount > 0 ? "text-red-700" : "text-slate-500"}`}>{urgentCount}</p>
              <p className={`text-xs font-medium ${urgentCount > 0 ? "text-red-600" : "text-slate-400"}`}>Термінові / високі</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Progress */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">Рівень закриття за сьогодні</span>
              <span className="text-muted-foreground">{resolveRate}%</span>
            </div>
            <Progress value={resolveRate} className="h-2" />
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{completedTodayCount} закрито</p>
            <p>{activeTotal} залишилось</p>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Alert */}
      {urgentCount > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="flex items-center gap-3 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 animate-pulse" />
            <p className="text-sm font-semibold text-red-800">
              Потрібна увага: {urgentCount} {pluralRequests(urgentCount)} з пріоритетом “Терміновий/Високий”.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук за описом, номером, категорією..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Активні</SelectItem>
            <SelectItem value="all">Усі</SelectItem>
            <SelectItem value="pending">{formatMaintenanceStatus("pending")}</SelectItem>
            <SelectItem value="in_progress">{formatMaintenanceStatus("in_progress")}</SelectItem>
            <SelectItem value="completed">{formatMaintenanceStatus("completed")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі пріоритети</SelectItem>
            <SelectItem value="urgent">{formatPriority("urgent")}</SelectItem>
            <SelectItem value="high">{formatPriority("high")}</SelectItem>
            <SelectItem value="medium">{formatPriority("medium")}</SelectItem>
            <SelectItem value="low">{formatPriority("low")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі категорії</SelectItem>
            {Object.entries(categoryConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Staff Workload (managers) */}
      {isManager && initialStaff.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Навантаження персоналу</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {initialStaff.map((s) => {
                const activeCount = allRequests.filter(
                  (r) => r.assigned_to === s.id && r.status !== "completed" && r.status !== "cancelled"
                ).length
                return (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {s.first_name[0]}{s.last_name[0]}
                    </div>
                    <span className="text-sm font-medium">{s.first_name}</span>
                    <Badge variant={activeCount > 3 ? "destructive" : activeCount > 0 ? "secondary" : "outline"} className="text-[10px]">
                      {activeCount}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests */}
      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Дошка</TabsTrigger>
          <TabsTrigger value="list">Список</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Pending Column */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <h3 className="text-sm font-semibold">{formatMaintenanceStatus("pending")}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{pendingCount}</Badge>
              </div>
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {filteredRequests.filter((r) => r.status === "pending").map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    isManager={isManager}
                    updatingId={updatingId}
                    profileId={profile.id}
                    onStatusChange={handleStatusChange}
                    onAssign={() => { setAssignReq(req); setAssignStaff(""); setAssignOpen(true) }}
                    onResolve={() => { setResolveReq(req); setResolution(""); setResolveOpen(true) }}
                  />
                ))}
                {filteredRequests.filter((r) => r.status === "pending").length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Немає заявок в очікуванні</p>
                )}
              </div>
            </div>
            {/* In Progress Column */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <h3 className="text-sm font-semibold">{formatMaintenanceStatus("in_progress")}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{inProgressCount}</Badge>
              </div>
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {filteredRequests.filter((r) => r.status === "in_progress").map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    isManager={isManager}
                    updatingId={updatingId}
                    profileId={profile.id}
                    onStatusChange={handleStatusChange}
                    onAssign={() => { setAssignReq(req); setAssignStaff(""); setAssignOpen(true) }}
                    onResolve={() => { setResolveReq(req); setResolution(""); setResolveOpen(true) }}
                  />
                ))}
                {filteredRequests.filter((r) => r.status === "in_progress").length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Немає заявок у процесі</p>
                )}
              </div>
            </div>
            {/* Completed Column */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-semibold">{formatMaintenanceStatus("completed")}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{completedTodayCount}</Badge>
              </div>
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {allRequests
                  .filter((r) => r.status === "completed" && r.completed_at && new Date(r.completed_at).toDateString() === new Date().toDateString())
                  .map((req) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      isManager={isManager}
                      updatingId={updatingId}
                      profileId={profile.id}
                      onStatusChange={handleStatusChange}
                      onAssign={() => {}}
                      onResolve={() => {}}
                    />
                  ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="flex flex-col gap-2">
            {filteredRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wrench className="mb-3 h-10 w-10" />
                <p>Технічних заявок не знайдено</p>
              </div>
            )}
            {filteredRequests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                isManager={isManager}
                updatingId={updatingId}
                profileId={profile.id}
                onStatusChange={handleStatusChange}
                onAssign={() => { setAssignReq(req); setAssignStaff(""); setAssignOpen(true) }}
                onResolve={() => { setResolveReq(req); setResolution(""); setResolveOpen(true) }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Нова технічна заявка</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Категорія</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Пріоритет</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{formatPriority("low")}</SelectItem>
                    <SelectItem value="medium">{formatPriority("medium")}</SelectItem>
                    <SelectItem value="high">{formatPriority("high")}</SelectItem>
                    <SelectItem value="urgent">{formatPriority("urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Номер (необов&apos;язково)</Label>
              <Select value={newRoomId} onValueChange={setNewRoomId}>
                <SelectTrigger><SelectValue placeholder="Без прив&apos;язки до номера" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без прив&apos;язки до номера</SelectItem>
                  {initialRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>Номер {r.room_number} (пов. {r.floor})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Опис</Label>
              <Textarea
                placeholder="Опишіть проблему детально..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
              />
            </div>
            {isManager && (
              <div className="flex flex-col gap-2">
                <Label>Призначити (необов&apos;язково)</Label>
                <Select value={newStaff} onValueChange={setNewStaff}>
                  <SelectTrigger><SelectValue placeholder="Без виконавця" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без виконавця</SelectItem>
                    {initialStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Скасувати</Button>
            <Button onClick={handleCreate} disabled={!newDesc.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Призначити заявку {assignReq?.rooms ? `— номер ${assignReq.rooms.room_number}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {assignReq && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium capitalize">{categoryConfig[assignReq.category]?.label || assignReq.category}</p>
                <p className="mt-1 text-muted-foreground">{assignReq.description}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Призначити на</Label>
              <Select value={assignStaff} onValueChange={setAssignStaff}>
                <SelectTrigger><SelectValue placeholder="Оберіть працівника..." /></SelectTrigger>
                <SelectContent>
                  {initialStaff.map((s) => {
                    const load = allRequests.filter((r) => r.assigned_to === s.id && r.status !== "completed" && r.status !== "cancelled").length
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({load} активних)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Скасувати</Button>
            <Button onClick={handleAssign} disabled={!assignStaff || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Призначити та почати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Закрити заявку</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {resolveReq && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium capitalize">{categoryConfig[resolveReq.category]?.label || resolveReq.category}</p>
                <p className="mt-1 text-muted-foreground">{resolveReq.description}</p>
                {resolveReq.rooms && <p className="mt-1 font-medium">Номер {resolveReq.rooms.room_number}</p>}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Примітки щодо виконання (необов&apos;язково)</Label>
              <Textarea
                placeholder="Що було зроблено для усунення проблеми..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Скасувати</Button>
            <Button onClick={handleResolve} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Позначити як виконано
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* --- Request Card --- */
function RequestCard({
  req,
  isManager,
  updatingId,
  profileId,
  onStatusChange,
  onAssign,
  onResolve,
}: {
  req: MaintRequest
  isManager: boolean
  updatingId: string | null
  profileId: string
  onStatusChange: (id: string, status: string) => void
  onAssign: () => void
  onResolve: () => void
}) {
  const pCfg = priorityConfig[req.priority] || priorityConfig.medium
  const catCfg = categoryConfig[req.category] || categoryConfig.general
  const sCfg = statusConfig[req.status] || statusConfig.pending
  const CatIcon = catCfg.icon
  const isMyRequest = req.assigned_to === profileId

  const timeSinceCreated = () => {
    const diff = Date.now() - new Date(req.created_at).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return `${Math.floor(diff / (1000 * 60))} хв тому`
    if (hours < 24) return `${hours} год тому`
    return `${Math.floor(hours / 24)} дн тому`
  }

  return (
    <Card className={`border-l-4 ${pCfg.border} ${isMyRequest ? "ring-1 ring-primary/20" : ""}`}>
      <CardContent className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CatIcon className={`h-4 w-4 ${catCfg.color}`} />
            <span className="text-sm font-semibold">{catCfg.label}</span>
            {req.rooms && (
              <Badge variant="outline" className="text-xs">
                Номер {req.rooms.room_number}
              </Badge>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${pCfg.class}`}>
              {formatPriority(req.priority)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{req.description}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className={`rounded px-1.5 py-0.5 font-medium ${sCfg.bg} ${sCfg.color}`}>
              {formatMaintenanceStatus(req.status)}
            </span>
            {req.assigned_profile && (
              <span className="font-medium text-primary">
                {req.assigned_profile.first_name} {req.assigned_profile.last_name}
                {isMyRequest && " (ви)"}
              </span>
            )}
            <span>{timeSinceCreated()}</span>
            {req.request_number && <span className="font-mono">{req.request_number}</span>}
          </div>
          {req.resolution && (
            <p className="mt-1 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 italic">{req.resolution}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {req.status === "pending" && isManager && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAssign}>
              <UserPlus className="mr-1 h-3 w-3" />
              Призначити
            </Button>
          )}
          {req.status === "pending" && (
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={updatingId === req.id}
              onClick={() => onStatusChange(req.id, "in_progress")}
            >
              {updatingId === req.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
              Почати
            </Button>
          )}
          {req.status === "in_progress" && (
            <Button
              size="sm"
              className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              disabled={updatingId === req.id}
              onClick={onResolve}
            >
              {updatingId === req.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
              Закрити
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
