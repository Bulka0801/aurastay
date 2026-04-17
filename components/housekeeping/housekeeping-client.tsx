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
import { HousekeepingKanban, type HKTask as KanbanHKTask } from "./housekeeping-kanban"
import { ROOM_STATUS_UK } from "@/lib/i18n/uk"

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

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  available: { label: "Готовий", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  occupied: { label: "Зайнятий", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  dirty: { label: "Брудний", bg: "bg-red-50", text: "text-red-700", border: "border-red-400" },
  cleaning: { label: "Прибирається", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-400" },
  inspecting: { label: "Перевірка", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300" },
  inspected: { label: "Перевірено", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300" },
  maintenance: { label: "Ремонт", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-400" },
  blocked: { label: "Блок", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-400" },
  out_of_order: { label: "Несправний", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-400" },
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  urgent: { label: "ТЕРМІНОВО", class: "bg-red-600 text-white" },
  high: { label: "Високий", class: "bg-red-100 text-red-800" },
  medium: { label: "Середній", class: "bg-amber-100 text-amber-800" },
  low: { label: "Низький", class: "bg-sky-100 text-sky-800" },
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
            Стан номерів та завдання з прибирання
            <span className="mx-2 text-border">|</span>
            <span className="font-medium text-red-600">{dirtyCount} брудних</span>
            <span className="mx-1 text-border">/</span>
            <span className="font-medium text-amber-600">{cleaningCount} в роботі</span>
            <span className="mx-1 text-border">/</span>
            <span className="font-medium text-emerald-600">{availableCount} готових</span>
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
            placeholder="Пошук по номерах або завданнях..."
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
            <SelectItem value="dirty">Брудний</SelectItem>
            <SelectItem value="cleaning">Прибирається</SelectItem>
            <SelectItem value="available">Готовий</SelectItem>
            <SelectItem value="occupied">Зайнятий</SelectItem>
            <SelectItem value="maintenance">Ремонт</SelectItem>
            <SelectItem value="inspecting">Перевірка</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Kanban ({allTasks.filter((t) => t.status !== "completed" && t.status !== "inspected").length})
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />
            Номери ({filteredRooms.length})
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
                            {cfg.label}
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
                              <SelectItem value="available">Готовий</SelectItem>
                              <SelectItem value="dirty">Брудний</SelectItem>
                              <SelectItem value="cleaning">Прибирається</SelectItem>
                              <SelectItem value="inspecting">На перевірці</SelectItem>
                              <SelectItem value="occupied">Зайнятий</SelectItem>
                              <SelectItem value="maintenance">Ремонт</SelectItem>
                              <SelectItem value="blocked">Заблокований</SelectItem>
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
              <p>Немає номерів за вашими фільтрами</p>
            </div>
          )}
        </TabsContent>

        {/* ===== KANBAN TAB ===== */}
        <TabsContent value="tasks" className="mt-4">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="mb-3 h-10 w-10" />
              <p>Немає завдань</p>
            </div>
          ) : (
            <HousekeepingKanban
              tasks={filteredTasks as unknown as KanbanHKTask[]}
              currentProfileId={profile.id}
              isSupervisor={isSupervisor}
              onMoveTask={async (taskId, next) => {
                await handleTaskStatusChange(taskId, next)
              }}
              onAssignRequest={(t) => {
                setAssignTask(t as unknown as HKTask)
                setAssignStaff("")
                setAssignOpen(true)
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Призначити завдання — № {assignTask?.rooms?.room_number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {assignTask && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><span className="font-medium">Тип:</span> {assignTask.task_type.replace(/_/g, " ")}</p>
                <p><span className="font-medium">Пріоритет:</span>{" "}
                  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${priorityConfig[assignTask.priority]?.class}`}>
                    {priorityConfig[assignTask.priority]?.label}
                  </span>
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Призначити покоївці</Label>
              <Select value={assignStaff} onValueChange={setAssignStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть покоївку..." />
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
            <DialogTitle>Створити завдання для покоївки</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Номер</Label>
              <Select value={newTaskRoomId} onValueChange={setNewTaskRoomId}>
                <SelectTrigger><SelectValue placeholder="Оберіть номер..." /></SelectTrigger>
                <SelectContent>
                  {allRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      № {r.room_number} (поверх {r.floor}) — {statusConfig[r.status]?.label || r.status}
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
                    <SelectItem value="standard_cleaning">Стандартне прибирання</SelectItem>
                    <SelectItem value="deep_cleaning">Глибоке прибирання</SelectItem>
                    <SelectItem value="turndown">Вечірнє обслуговування</SelectItem>
                    <SelectItem value="inspection">Перевірка</SelectItem>
                    <SelectItem value="linen_change">Зміна білизни</SelectItem>
                    <SelectItem value="minibar_restock">Поповнення мінібару</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Пріоритет</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низький</SelectItem>
                    <SelectItem value="medium">Середній</SelectItem>
                    <SelectItem value="high">Високий</SelectItem>
                    <SelectItem value="urgent">Терміново</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Призначити (необов&apos;язково)</Label>
              <Select value={newTaskStaff} onValueChange={setNewTaskStaff}>
                <SelectTrigger><SelectValue placeholder="Не призначено" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не призначено</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Примітки</Label>
              <Textarea placeholder="Спеціальні інструкції..." value={newTaskNotes} onChange={(e) => setNewTaskNotes(e.target.value)} rows={2} />
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
