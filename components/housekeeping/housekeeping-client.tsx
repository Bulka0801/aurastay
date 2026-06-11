"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Sparkles,
  BedDouble,
  Clock,
} from "lucide-react"
import {
  ACTIVE_HOUSEKEEPING_STATUSES,
  ARCHIVED_HOUSEKEEPING_STATUSES,
  type Profile,
  type RoomHousekeepingStatus,
} from "@/lib/types"
import useSWR from "swr"
import { HousekeepingKanban, type HKTask as KanbanHKTask } from "./housekeeping-kanban"
import { formatDate, formatDateTime, formatTaskType } from "@/lib/localization"
import {
  isHousekeepingInspectionTask,
  shouldAutoCreateInspection,
} from "@/lib/rules/transitions"

interface Room {
  id: string
  room_number: string
  floor: number
  status: string
  occupancy_status: string
  housekeeping_status: RoomHousekeepingStatus
  operational_status: string
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
  scheduled_date: string
  started_at: string | null
  created_at: string
  completed_at: string | null
  inspected_at: string | null
  updated_at: string | null
  rooms: { room_number: string; floor: number; room_type: { name: string } | null } | null
  assigned_profile: { id: string; first_name: string; last_name: string } | null
}

const HISTORY_PAGE_SIZE = 12

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  clean: { label: "Чистий", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-300" },
  dirty: { label: "Брудний", bg: "bg-red-50", text: "text-red-700", border: "border-red-400" },
  cleaning: { label: "Прибирається", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-400" },
  inspecting: { label: "Перевірка", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300" },
  inspected: { label: "Перевірено", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  urgent: { label: "ТЕРМІНОВИЙ", class: "bg-red-600 text-white" },
  high: { label: "Високий", class: "bg-red-100 text-red-800" },
  normal: { label: "Середній", class: "bg-amber-100 text-amber-800" },
  low: { label: "Низький", class: "bg-sky-100 text-sky-800" },
}

async function fetchTasks() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("housekeeping_tasks")
    .select(
      `*, rooms(room_number, floor, room_type:room_types(name)), assigned_profile:profiles!housekeeping_tasks_assigned_to_fkey(id, first_name, last_name)`
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

function logSupabaseError(action: string, error: { message?: string } | null) {
  if (error) console.error(`[housekeeping] ${action}:`, error.message ?? error)
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
  const isSupervisor = profile.role === "housekeeping_supervisor" || profile.role === "system_administrator"

  const [search, setSearch] = useState("")
  const [floorFilter, setFloorFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [updatingRoom, setUpdatingRoom] = useState<string | null>(null)

  // New task dialog
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskRoomId, setNewTaskRoomId] = useState("")
  const [newTaskType, setNewTaskType] = useState("standard_cleaning")
  const [newTaskPriority, setNewTaskPriority] = useState("normal")
  const [newTaskNotes, setNewTaskNotes] = useState("")
  const [newTaskStaff, setNewTaskStaff] = useState("")
  const [saving, setSaving] = useState(false)

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<HKTask | null>(null)
  const [assignStaff, setAssignStaff] = useState("")
  const [selectedTask, setSelectedTask] = useState<HKTask | null>(null)
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE)

  const allRooms = rooms || initialRooms
  const allTasks = tasks || []

  const floors = [...new Set(allRooms.map((r) => r.floor))].sort((a, b) => a - b)

  const filteredRooms = allRooms.filter((room) => {
    if (search && !room.room_number.toLowerCase().includes(search.toLowerCase())) return false
    if (floorFilter !== "all" && room.floor !== Number(floorFilter)) return false
    if (statusFilter !== "all" && room.housekeeping_status !== statusFilter) return false
    return true
  })

  const taskMatchesSearch = (t: HKTask) => {
    const query = search.toLowerCase()
    if (
      search &&
      !t.rooms?.room_number?.toLowerCase().includes(query) &&
      !t.assigned_profile?.first_name?.toLowerCase().includes(query) &&
      !t.assigned_profile?.last_name?.toLowerCase().includes(query) &&
      !formatTaskType(t.task_type).toLowerCase().includes(query) &&
      !t.task_type.toLowerCase().includes(query) &&
      !t.notes?.toLowerCase().includes(query)
    )
      return false
    return true
  }

  const isArchivedTask = (task: HKTask) =>
    (ARCHIVED_HOUSEKEEPING_STATUSES as readonly string[]).includes(task.status) ||
    (task.status === "completed" && isHousekeepingInspectionTask(task.task_type))

  const activeTasks = allTasks.filter((t) =>
    (ACTIVE_HOUSEKEEPING_STATUSES as readonly string[]).includes(t.status) && !isArchivedTask(t)
  )
  const visibleActiveTasks = isSupervisor
    ? activeTasks
    : activeTasks.filter((t) => t.assigned_to === profile.id || !t.assigned_to)
  const archivedTasks = allTasks.filter(isArchivedTask)
  const filteredTasks = visibleActiveTasks.filter(taskMatchesSearch)
  const filteredHistoryTasks = archivedTasks.filter(taskMatchesSearch)
  const visibleHistoryTasks = filteredHistoryTasks.slice(0, historyLimit)
  const hiddenHistoryCount = Math.max(0, filteredHistoryTasks.length - visibleHistoryTasks.length)

  const roomsByFloor = filteredRooms.reduce(
    (acc, room) => {
      if (!acc[room.floor]) acc[room.floor] = []
      acc[room.floor].push(room)
      return acc
    },
    {} as Record<number, Room[]>
  )

  // Status counts
  const dirtyCount = allRooms.filter((r) => r.housekeeping_status === "dirty").length
  const cleaningCount = allRooms.filter((r) => r.housekeeping_status === "cleaning").length
  const availableCount = allRooms.filter(
    (r) => r.housekeeping_status === "clean" || r.housekeeping_status === "inspected",
  ).length
  const cleaningToReviewCount = allRooms.filter((r) => r.housekeeping_status === "inspecting").length

  const handleRoomStatusChange = async (roomId: string, newStatus: RoomHousekeepingStatus) => {
    setUpdatingRoom(roomId)
    const supabase = createClient()
    await supabase.from("rooms").update({ housekeeping_status: newStatus }).eq("id", roomId)
    setUpdatingRoom(null)
    mutateRooms()
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    const supabase = createClient()
    const task = allTasks.find((t) => t.id === taskId)
    const taskType = task?.task_type ?? ""
    const resolvedStatus = newStatus === "completed" && isHousekeepingInspectionTask(taskType) ? "inspected" : newStatus
    const updateData: Record<string, string | null> = { status: resolvedStatus }
    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString()
    }
    if (newStatus === "inspected" && task?.room_id) {
      updateData.completed_at = task.completed_at ?? new Date().toISOString()
      updateData.inspected_at = new Date().toISOString()
      updateData.inspected_by = profile.id
    }
    if (newStatus === "in_progress") {
      updateData.started_at = new Date().toISOString()
      if (!task?.assigned_to) {
        updateData.assigned_to = profile.id
      }
    }
    const { error } = await supabase.from("housekeeping_tasks").update(updateData).eq("id", taskId)
    logSupabaseError(`update task ${taskId} to ${resolvedStatus}`, error)
    mutateTasks()
    mutateRooms()
  }

  const handleCreateTask = async () => {
    if (!newTaskRoomId) return
    setSaving(true)
    const supabase = createClient()
    const staffId = newTaskStaff === "none" ? null : newTaskStaff || null
    const needsCleaningStatus = shouldAutoCreateInspection(newTaskType)
    await supabase.from("housekeeping_tasks").insert({
      room_id: newTaskRoomId,
      task_type: newTaskType,
      priority: newTaskPriority,
      status: staffId ? "assigned" : "pending",
      notes: newTaskNotes || null,
      assigned_to: staffId,
      started_at: null,
      scheduled_date: new Date().toISOString().split("T")[0],
    })
    if (needsCleaningStatus && newTaskType !== "inspection") {
      await supabase.from("rooms").update({ housekeeping_status: "dirty" }).eq("id", newTaskRoomId)
      mutateRooms()
    }
    setSaving(false)
    setNewTaskOpen(false)
    setNewTaskRoomId("")
    setNewTaskType("standard_cleaning")
    setNewTaskPriority("normal")
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
      .update({ assigned_to: assignStaff, status: "assigned" })
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

      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">Підказка</Badge>
            <span>Перетягни задачу в потрібний статус. Після прибирання може автоматично з’явитися перевірка.</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{cleaningToReviewCount} номерів на перевірці</span>
            <span className="hidden sm:inline">•</span>
            <span>{activeTasks.length} активних задач</span>
          </div>
        </CardContent>
      </Card>

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
            <SelectItem value="inspected">Перевірка</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Шукай за номером кімнати, типом задачі або виконавцем. Фільтри допомагають швидко залишити тільки потрібне.
      </p>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Дошка ({filteredTasks.length})
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1.5">
            <BedDouble className="h-3.5 w-3.5" />
            Номери ({filteredRooms.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Історія</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {filteredHistoryTasks.length > 99 ? "99+" : filteredHistoryTasks.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ===== ROOMS TAB ===== */}
        <TabsContent value="rooms" className="mt-4">
          <p className="mb-3 text-xs text-muted-foreground">
            {isSupervisor
              ? "Тут видно швидкий стан кожного номера. Сірий/зелений/жовтий бейдж підкаже, що відбувається."
              : "Тут видно, які номери вже готові, які прибираються і які ще чекають перевірки."}
          </p>
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
                      const cfg = statusConfig[room.housekeeping_status] || statusConfig.clean
                      const roomActiveTasks = activeTasks.filter((t) => t.room_id === room.id).length
                      return (
                        <div
                          key={room.id}
                          className={`relative rounded-lg border-2 p-2.5 transition-colors ${cfg.bg} ${cfg.border}`}
                        >
                          {roomActiveTasks > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {roomActiveTasks}
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
                            value={room.housekeeping_status}
                            onValueChange={(v) =>
                              handleRoomStatusChange(room.id, v as RoomHousekeepingStatus)
                            }
                            disabled={updatingRoom === room.id}
                          >
                            <SelectTrigger className="mt-1.5 h-6 text-[10px] px-1.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clean">Чистий</SelectItem>
                              <SelectItem value="dirty">Брудний</SelectItem>
                              <SelectItem value="cleaning">Прибирається</SelectItem>
                              <SelectItem value="inspecting">На перевірці</SelectItem>
                              <SelectItem value="inspected">Перевірено</SelectItem>
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
          <p className="mb-3 text-xs text-muted-foreground">
            {isSupervisor
              ? "Дошка показує всі задачі. Перетягни картку в потрібну колонку або признач її працівнику."
              : "Дошка показує лише твої задачі. Перетягни картку, щоб змінити статус."}
          </p>
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
              onInspectTask={async (taskId) => {
                await handleTaskStatusChange(taskId, "inspected")
              }}
              onAssignRequest={(t) => {
                setAssignTask(t as unknown as HKTask)
                setAssignStaff("")
                setAssignOpen(true)
              }}
              onTaskDetails={(task) => setSelectedTask(task as unknown as HKTask)}
            />
          )}
        </TabsContent>

        {/* ===== HISTORY TAB ===== */}
        <TabsContent value="history" className="mt-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Тут зберігаються завершені й перевірені задачі. Це журнал того, що вже закрито.
          </p>
          {filteredHistoryTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CheckCircle2 className="mb-3 h-10 w-10" />
              <p>Поки немає завершених задач</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2">
              {visibleHistoryTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">№ {task.rooms?.room_number ?? "?"}</span>
                      <Badge variant="secondary" className="text-[10px]">Перевірено</Badge>
                      <Badge className={`text-[10px] ${priorityConfig[task.priority]?.class ?? priorityConfig.normal.class}`}>
                        {priorityConfig[task.priority]?.label ?? priorityConfig.normal.label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{formatTaskType(task.task_type)}</p>
                    {task.assigned_profile && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Виконавець: {task.assigned_profile.first_name} {task.assigned_profile.last_name}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Створено: {formatDateTime(task.created_at)}
                      {task.started_at ? ` · Початок: ${formatDateTime(task.started_at)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-muted-foreground">
                    {task.completed_at ? formatDateTime(task.completed_at) : "Без дати завершення"}
                  </p>
                </button>
              ))}
              </div>
              {hiddenHistoryCount > 0 && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setHistoryLimit((current) => current + HISTORY_PAGE_SIZE)}>
                    Показати ще {Math.min(HISTORY_PAGE_SIZE, hiddenHistoryCount)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedTask)} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Завдання № {selectedTask?.rooms?.room_number ?? "?"}
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{formatTaskType(selectedTask.task_type)}</Badge>
                <Badge className={priorityConfig[selectedTask.priority]?.class ?? priorityConfig.normal.class}>
                  {priorityConfig[selectedTask.priority]?.label ?? priorityConfig.normal.label}
                </Badge>
                <Badge variant="secondary">{selectedTask.status}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Номер" value={`№ ${selectedTask.rooms?.room_number ?? "?"}, поверх ${selectedTask.rooms?.floor ?? "—"}`} />
                <DetailItem label="Тип номера" value={selectedTask.rooms?.room_type?.name ?? "—"} />
                <DetailItem label="Виконавець" value={selectedTask.assigned_profile ? `${selectedTask.assigned_profile.first_name} ${selectedTask.assigned_profile.last_name}` : "Не призначено"} />
                <DetailItem label="Планова дата" value={formatDate(selectedTask.scheduled_date)} />
                <DetailItem label="Створено" value={formatDateTime(selectedTask.created_at)} />
                <DetailItem label="Початок роботи" value={formatDateTime(selectedTask.started_at)} />
                <DetailItem label="Завершено" value={formatDateTime(selectedTask.completed_at)} />
                <DetailItem label="Оновлено" value={formatDateTime(selectedTask.updated_at)} />
              </div>
              {selectedTask.notes && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Примітки</p>
                  <p>{selectedTask.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Призначити завдання — № {assignTask?.rooms?.room_number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {assignTask && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><span className="font-medium">Тип:</span> {formatTaskType(assignTask.task_type)}</p>
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
                    const load = activeTasks.filter((t) => t.assigned_to === s.id).length
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({load} активних)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Обери працівника, щоб задача одразу перейшла в роботу.
              </p>
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
                      № {r.room_number} (поверх {r.floor}) —{" "}
                      {statusConfig[r.housekeeping_status]?.label ||
                        r.housekeeping_status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Спочатку вибери номер, для якого потрібне завдання.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <Label>Тип завдання</Label>
                <Select value={newTaskType} onValueChange={setNewTaskType}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue className="min-w-0 flex-1 truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_cleaning">Стандартне прибирання</SelectItem>
                    <SelectItem value="deep_cleaning">Глибоке прибирання</SelectItem>
                    <SelectItem value="turndown">Вечірнє обслуговування</SelectItem>
                    <SelectItem value="inspection">Перевірка</SelectItem>
                    <SelectItem value="linen_change">Зміна білизни</SelectItem>
                    <SelectItem value="minibar_restock">Поповнення мінібару</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Для прибирання після завершення може створитися окрема перевірка.
                </p>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <Label>Пріоритет</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низький</SelectItem>
                    <SelectItem value="normal">Середній</SelectItem>
                    <SelectItem value="high">Високий</SelectItem>
                    <SelectItem value="urgent">Терміновий</SelectItem>
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
              <p className="text-xs text-muted-foreground">
                Якщо виконавця не обрати, задача залишиться в очікуванні.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Примітки</Label>
              <Textarea placeholder="Спеціальні інструкції..." value={newTaskNotes} onChange={(e) => setNewTaskNotes(e.target.value)} rows={2} />
              <p className="text-xs text-muted-foreground">
                Тут можна додати коротку інструкцію або уточнення для працівника.
              </p>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  )
}
