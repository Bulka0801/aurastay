"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { formatPriority, formatRoomStatus, formatTaskType } from "@/lib/localization"
import {
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  Loader2,
  UserPlus,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  BedDouble,
  Clock,
} from "lucide-react"
import type { Profile } from "@/lib/types"
import useSWR from "swr"

interface Room {
  id: string
  room_number: string
  floor: number
  status: string
  notes: string | null
  room_type: { name: string } | null
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface HKTask {
  id: string
  room_id: string
  assigned_to: string | null
  task_type: string
  priority: string
  status: string
  notes: string | null
  created_at: string
  completed_at: string | null
  rooms: { room_number: string; floor: number; room_type: { name: string } | null } | null
  assigned_profile: { id: string; first_name: string; last_name: string } | null
}

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  available: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  occupied: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  dirty: { bg: "bg-red-50", text: "text-red-700", border: "border-red-400" },
  cleaning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-400" },
  inspected: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300" },
  maintenance: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-400" },
  blocked: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-400" },
}

const priorityConfig: Record<string, { class: string }> = {
  urgent: { class: "bg-red-600 text-white" },
  high: { class: "bg-red-100 text-red-800" },
  medium: { class: "bg-amber-100 text-amber-800" },
  low: { class: "bg-sky-100 text-sky-800" },
}

function formatTaskStatus(status: string) {
  if (status === "pending") return "Очікує"
  if (status === "in_progress") return "У процесі"
  if (status === "completed") return "Виконано"
  return status
}

async function fetchTasks() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("housekeeping_tasks")
    .select(
      `*, rooms(room_number, floor, room_type:room_types(name)), assigned_profile:profiles!assigned_to(id, first_name, last_name)`
    )
    .order("created_at", { ascending: false })
  if (error) {
    console.log("[v0] fetchTasks error:", error.message)
    // Fallback without FK alias
    const { data: fallback } = await supabase
      .from("housekeeping_tasks")
      .select(`*, rooms(room_number, floor, room_type:room_types(name))`)
      .order("created_at", { ascending: false })
    return (fallback || []).map((t: Record<string, unknown>) => ({ ...t, assigned_profile: null })) as HKTask[]
  }
  return (data || []) as HKTask[]
}

async function fetchRooms() {
  const supabase = createClient()
  const { data } = await supabase.from("rooms").select("*, room_type:room_types(name)").order("room_number")
  return (data || []) as Room[]
}

export function HousekeepingClient({
  profile,
  initialRooms,
  initialStaff,
}: {
  profile: Profile
  initialRooms: Room[]
  initialStaff: StaffMember[]
}) {
  const { data: tasks, mutate: mutateTasks, isLoading: tasksLoading } = useSWR("hk-tasks", fetchTasks, {
    refreshInterval: 10000,
  })
  const { data: rooms, mutate: mutateRooms } = useSWR("hk-rooms", fetchRooms, {
    fallbackData: initialRooms,
    refreshInterval: 10000,
  })

  const staff = initialStaff
  const isSupervisor = profile.role === "housekeeping_supervisor" || profile.role === "system_admin"

  const [search, setSearch] = useState("")
  const [floorFilter, setFloorFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [updatingRoom, setUpdatingRoom] = useState<string | null>(null)
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)

  // New task dialog
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskRoomId, setNewTaskRoomId] = useState("")
  const [newTaskType, setNewTaskType] = useState("standard_cleaning")
  const [newTaskPriority, setNewTaskPriority] = useState("medium")
  const [newTaskNotes, setNewTaskNotes] = useState("")
  const [newTaskStaff, setNewTaskStaff] = useState("")
  const [saving, setSaving] = useState(false)

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<HKTask | null>(null)
  const [assignStaff, setAssignStaff] = useState("")

  const allRooms = rooms || initialRooms
  const allTasks = tasks || []

  const floors = [...new Set(allRooms.map((r) => r.floor))].sort((a, b) => a - b)

  const filteredRooms = allRooms.filter((room) => {
    if (search && !room.room_number.toLowerCase().includes(search.toLowerCase())) return false
    if (floorFilter !== "all" && room.floor !== Number(floorFilter)) return false
    if (statusFilter !== "all" && room.status !== statusFilter) return false
    return true
  })

  const filteredTasks = allTasks.filter((t) => {
    if (taskFilter !== "all" && t.status !== taskFilter) return false
    if (
      search &&
      !t.rooms?.room_number?.toLowerCase().includes(search.toLowerCase()) &&
      !t.assigned_profile?.first_name?.toLowerCase().includes(search.toLowerCase()) &&
      !t.task_type.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  const roomsByFloor = filteredRooms.reduce(
    (acc, room) => {
      if (!acc[room.floor]) acc[room.floor] = []
      acc[room.floor].push(room)
      return acc
    },
    {} as Record<number, Room[]>
  )

  // Status counts
  const dirtyCount = allRooms.filter((r) => r.status === "dirty").length
  const cleaningCount = allRooms.filter((r) => r.status === "cleaning").length
  const availableCount = allRooms.filter((r) => r.status === "available").length

  const handleRoomStatusChange = async (roomId: string, newStatus: string) => {
    setUpdatingRoom(roomId)
    const supabase = createClient()
    await supabase.from("rooms").update({ status: newStatus }).eq("id", roomId)
    setUpdatingRoom(null)
    mutateRooms()
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId)
    const supabase = createClient()
    const updateData: Record<string, string | null> = { status: newStatus }
    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString()
      const task = allTasks.find((t) => t.id === taskId)
      if (task?.room_id) {
        await supabase.from("rooms").update({ status: "available" }).eq("id", task.room_id)
        mutateRooms()
      }
    }
    if (newStatus === "in_progress") {
      updateData.started_at = new Date().toISOString()
      if (!allTasks.find((t) => t.id === taskId)?.assigned_to) {
        updateData.assigned_to = profile.id
      }
    }
    await supabase.from("housekeeping_tasks").update(updateData).eq("id", taskId)
    setUpdatingTask(null)
    mutateTasks()
  }

  const handleCreateTask = async () => {
    if (!newTaskRoomId) return
    setSaving(true)
    const supabase = createClient()
    const staffId = newTaskStaff === "none" ? null : newTaskStaff || null
    await supabase.from("housekeeping_tasks").insert({
      room_id: newTaskRoomId,
      task_type: newTaskType,
      priority: newTaskPriority,
      status: staffId ? "in_progress" : "pending",
      notes: newTaskNotes || null,
      assigned_to: staffId,
      started_at: staffId ? new Date().toISOString() : null,
      scheduled_date: new Date().toISOString().split("T")[0],
    })
    if (newTaskType.includes("cleaning")) {
      await supabase.from("rooms").update({ status: staffId ? "cleaning" : "dirty" }).eq("id", newTaskRoomId)
      mutateRooms()
    }
    setSaving(false)
    setNewTaskOpen(false)
    setNewTaskRoomId("")
    setNewTaskType("standard_cleaning")
    setNewTaskPriority("medium")
    setNewTaskNotes("")
    setNewTaskStaff("")
    mutateTasks()
  }

  const handleAssign = async () => {
    if (!assignTask || !assignStaff) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from("housekeeping_tasks")
      .update({ assigned_to: assignStaff, started_at: new Date().toISOString(), status: "in_progress" })
      .eq("id", assignTask.id)
    setSaving(false)
    setAssignOpen(false)
    setAssignTask(null)
    setAssignStaff("")
    mutateTasks()
  }

  const refreshAll = () => {
    mutateTasks()
    mutateRooms()
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Господарська служба</h1>
          <p className="text-sm text-muted-foreground">
            Статуси номерів і завдання прибирання
            <span className="mx-2 text-border">|</span>
            <span className="font-medium text-red-600">{dirtyCount} брудних</span>
            <span className="mx-1 text-border">/</span>
            <span className="font-medium text-amber-600">{cleaningCount} прибираються</span>
            <span className="mx-1 text-border">/</span>
            <span className="font-medium text-emerald-600">{availableCount} чистих</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${tasksLoading ? "animate-spin" : ""}`} />
            Оновити
          </Button>
          {isSupervisor && (
            <Button size="sm" onClick={() => setNewTaskOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Нове завдання
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук номерів або завдань..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={floorFilter} onValueChange={setFloorFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Поверх" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі поверхи</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f} value={String(f)}>
                Поверх {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі статуси</SelectItem>
            <SelectItem value="dirty">{formatRoomStatus("dirty")}</SelectItem>
            <SelectItem value="cleaning">{formatRoomStatus("cleaning")}</SelectItem>
            <SelectItem value="available">{formatRoomStatus("available")}</SelectItem>
            <SelectItem value="occupied">{formatRoomStatus("occupied")}</SelectItem>
            <SelectItem value="maintenance">{formatRoomStatus("maintenance")}</SelectItem>
            <SelectItem value="inspected">{formatRoomStatus("inspected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="rooms" className="w-full">
        <TabsList>
          <TabsTrigger value="rooms" className="gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />
            Номери ({filteredRooms.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Завдання ({allTasks.filter((t) => t.status !== "completed").length})
          </TabsTrigger>
        </TabsList>

        {/* ===== ROOMS TAB ===== */}
        <TabsContent value="rooms" className="mt-4">
          {Object.entries(roomsByFloor)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([floor, floorRooms]) => (
              <div key={floor} className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Поверх {floor}
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {floorRooms
                    .sort((a, b) => a.room_number.localeCompare(b.room_number))
                    .map((room) => {
                      const cfg = statusConfig[room.status] || statusConfig.available
                      const activeTasks = allTasks.filter(
                        (t) => t.room_id === room.id && t.status !== "completed"
                      ).length
                      return (
                        <div
                          key={room.id}
                          className={`relative rounded-lg border-2 p-2.5 transition-colors ${cfg.bg} ${cfg.border}`}
                        >
                          {activeTasks > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {activeTasks}
                            </span>
                          )}
                          <p className="text-lg font-bold leading-none">{room.room_number}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                            {room.room_type?.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-1.5 w-full justify-center text-[10px] py-0 ${cfg.text} border-current`}
                          >
                            {formatRoomStatus(room.status)}
                          </Badge>
                          <Select
                            value={room.status}
                            onValueChange={(v) => handleRoomStatusChange(room.id, v)}
                            disabled={updatingRoom === room.id}
                          >
                            <SelectTrigger className="mt-1.5 h-6 text-[10px] px-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">{formatRoomStatus("available")}</SelectItem>
                              <SelectItem value="dirty">{formatRoomStatus("dirty")}</SelectItem>
                              <SelectItem value="cleaning">{formatRoomStatus("cleaning")}</SelectItem>
                              <SelectItem value="inspected">{formatRoomStatus("inspected")}</SelectItem>
                              <SelectItem value="occupied">{formatRoomStatus("occupied")}</SelectItem>
                              <SelectItem value="maintenance">{formatRoomStatus("maintenance")}</SelectItem>
                              <SelectItem value="blocked">{formatRoomStatus("blocked")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          {filteredRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BedDouble className="mb-3 h-10 w-10" />
              <p>Немає номерів, що відповідають фільтрам</p>
            </div>
          )}
        </TabsContent>

        {/* ===== TASKS TAB ===== */}
        <TabsContent value="tasks" className="mt-4">
          <div className="mb-4 flex gap-2 flex-wrap">
            {(["all", "pending", "in_progress", "completed"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={taskFilter === f ? "default" : "outline"}
                onClick={() => setTaskFilter(f)}
              >
                {f === "all" ? "Усі" : f === "in_progress" ? "У процесі" : f === "pending" ? "Очікує" : "Виконано"}
                <span className="ml-1.5 text-xs opacity-70">
                  ({f === "all" ? allTasks.length : allTasks.filter((t) => t.status === f).length})
                </span>
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CheckCircle2 className="mb-3 h-10 w-10" />
                <p>Завдань не знайдено</p>
              </div>
            )}
            {filteredTasks.map((task) => {
              const pCfg = priorityConfig[task.priority] || priorityConfig.medium
              const isMyTask = task.assigned_to === profile.id
              return (
                <Card
                  key={task.id}
                  className={`border-l-4 ${
                    task.priority === "urgent"
                      ? "border-l-red-600"
                      : task.priority === "high"
                        ? "border-l-red-400"
                        : task.priority === "medium"
                          ? "border-l-amber-400"
                          : "border-l-sky-400"
                  } ${isMyTask ? "bg-primary/5" : ""}`}
                >
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-base font-bold">{task.rooms?.room_number || "?"}</span>
                        <span className="text-xs text-muted-foreground">Пов. {task.rooms?.floor}</span>
                        {task.rooms?.room_type && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {task.rooms.room_type.name}
                          </Badge>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${pCfg.class}`}>
                          {formatPriority(task.priority)}
                        </span>
                        <Badge
                          variant={task.status === "completed" ? "default" : task.status === "in_progress" ? "secondary" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {formatTaskStatus(task.status)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {formatTaskType(task.task_type)}
                        {task.notes && ` -- ${task.notes}`}
                      </p>
                      {task.assigned_profile && (
                        <p className="mt-0.5 text-xs font-medium text-primary">
                          {task.assigned_profile.first_name} {task.assigned_profile.last_name}
                          {isMyTask && " (ви)"}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {task.status === "pending" && !task.assigned_to && isSupervisor && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAssignTask(task)
                            setAssignStaff("")
                            setAssignOpen(true)
                          }}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          Призначити
                        </Button>
                      )}
                      {task.status === "pending" && (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={updatingTask === task.id}
                          onClick={() => handleTaskStatusChange(task.id, "in_progress")}
                        >
                          {updatingTask === task.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ArrowRight className="mr-1 h-3 w-3" />}
                          Почати
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button
                          size="sm"
                          className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
                          disabled={updatingTask === task.id}
                          onClick={() => handleTaskStatusChange(task.id, "completed")}
                        >
                          {updatingTask === task.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                          Готово
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Призначити завдання — номер {assignTask?.rooms?.room_number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {assignTask && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><span className="font-medium">Тип:</span> {formatTaskType(assignTask.task_type)}</p>
                <p><span className="font-medium">Пріоритет:</span>{" "}
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${priorityConfig[assignTask.priority]?.class}`}>
                    {formatPriority(assignTask.priority)}
                  </span>
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Призначити на</Label>
              <Select value={assignStaff} onValueChange={setAssignStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть працівника..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => {
                    const load = allTasks.filter((t) => t.assigned_to === s.id && t.status !== "completed").length
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

      {/* New Task Dialog */}
      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Створити завдання господарської служби</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Номер</Label>
              <Select value={newTaskRoomId} onValueChange={setNewTaskRoomId}>
                <SelectTrigger><SelectValue placeholder="Оберіть номер..." /></SelectTrigger>
                <SelectContent>
                  {allRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Номер {r.room_number} (поверх {r.floor}) — {formatRoomStatus(r.status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Тип завдання</Label>
                <Select value={newTaskType} onValueChange={setNewTaskType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_cleaning">{formatTaskType("standard_cleaning")}</SelectItem>
                    <SelectItem value="deep_cleaning">{formatTaskType("deep_cleaning")}</SelectItem>
                    <SelectItem value="turndown">{formatTaskType("turndown")}</SelectItem>
                    <SelectItem value="inspection">{formatTaskType("inspection")}</SelectItem>
                    <SelectItem value="linen_change">{formatTaskType("linen_change")}</SelectItem>
                    <SelectItem value="minibar_restock">{formatTaskType("minibar_restock")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Пріоритет</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
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
              <Label>Призначити (необов&apos;язково)</Label>
              <Select value={newTaskStaff} onValueChange={setNewTaskStaff}>
                <SelectTrigger><SelectValue placeholder="Без виконавця" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без виконавця</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Примітки</Label>
              <Textarea placeholder="Особливі інструкції..." value={newTaskNotes} onChange={(e) => setNewTaskNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskOpen(false)}>Скасувати</Button>
            <Button onClick={handleCreateTask} disabled={!newTaskRoomId || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити завдання
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
