"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import {
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Sparkles,
  UserPlus,
  RefreshCw,
  Loader2,
  BedDouble,
  ArrowRight,
  CircleDot,
  Timer,
  Search,
  ClipboardList,
  TrendingUp,
  Clock,
  Zap,
  Eye,
} from "lucide-react"
import Link from "next/link"
import type { Profile } from "@/lib/types"
import useSWR from "swr"

interface HousekeepingDashboardProps {
  profile: Profile
}

interface RoomCount {
  status: string
  count: number
}

interface HKTask {
  id: string
  room_id: string
  assigned_to: string | null
  task_type: string
  priority: string
  status: string
  notes: string | null
  scheduled_date: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  rooms: {
    room_number: string
    floor: number
    status: string
    room_type: { name: string } | null
  } | null
  assigned_profile: {
    id: string
    first_name: string
    last_name: string
  } | null
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  role: string
}

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

const priorityConfig: Record<string, { label: string; class: string; ring: string; dotColor: string }> = {
  urgent: { label: "URGENT", class: "bg-red-600 text-white", ring: "ring-2 ring-red-400 ring-offset-1", dotColor: "bg-red-500" },
  high: { label: "High", class: "bg-red-100 text-red-800 border border-red-300", ring: "ring-2 ring-red-200", dotColor: "bg-red-400" },
  medium: { label: "Medium", class: "bg-amber-100 text-amber-800 border border-amber-300", ring: "", dotColor: "bg-amber-400" },
  low: { label: "Low", class: "bg-sky-100 text-sky-800 border border-sky-300", ring: "", dotColor: "bg-sky-400" },
}

const taskTypeLabels: Record<string, string> = {
  standard_cleaning: "Standard Clean",
  deep_cleaning: "Deep Clean",
  turndown: "Turndown",
  inspection: "Inspection",
  linen_change: "Linen Change",
  minibar_restock: "Minibar",
}

async function fetchDashboardData() {
  const supabase = createClient()

  const [roomsRes, tasksRes, staffRes, completedTodayRes] = await Promise.all([
    supabase.from("rooms").select("status"),
    supabase
      .from("housekeeping_tasks")
      .select(
        `*, rooms(room_number, floor, status, room_type:room_types(name)), assigned_profile:profiles!housekeeping_tasks_assigned_to_fkey(id, first_name, last_name)`
      )
      .neq("status", "completed")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, role")
      .in("role", ["housekeeping_staff", "housekeeping_supervisor"])
      .eq("is_active", true),
    supabase
      .from("housekeeping_tasks")
      .select("id, completed_at")
      .eq("status", "completed")
      .gte("completed_at", new Date().toISOString().split("T")[0]),
  ])

  const roomCounts: RoomCount[] = []
  const statusMap: Record<string, number> = {}
  ;(roomsRes.data || []).forEach((r) => {
    statusMap[r.status] = (statusMap[r.status] || 0) + 1
  })
  Object.entries(statusMap).forEach(([status, count]) => roomCounts.push({ status, count }))

  return {
    roomCounts,
    tasks: ((tasksRes.data || []) as HKTask[]).sort(
      (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    ),
    staff: (staffRes.data || []) as StaffMember[],
    totalRooms: roomsRes.data?.length || 0,
    completedToday: completedTodayRes.data?.length || 0,
  }
}

export function HousekeepingDashboard({ profile }: HousekeepingDashboardProps) {
  const { data, mutate, isLoading } = useSWR("hk-dashboard", fetchDashboardData, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<HKTask | null>(null)
  const [selectedStaff, setSelectedStaff] = useState("")
  const [saving, setSaving] = useState(false)
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [currentTime, setCurrentTime] = useState(new Date())

  // New task form
  const [newTaskRoomId, setNewTaskRoomId] = useState("")
  const [newTaskType, setNewTaskType] = useState("standard_cleaning")
  const [newTaskPriority, setNewTaskPriority] = useState("medium")
  const [newTaskNotes, setNewTaskNotes] = useState("")
  const [newTaskStaff, setNewTaskStaff] = useState("")
  const [rooms, setRooms] = useState<{ id: string; room_number: string; floor: number; status: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("rooms")
      .select("id, room_number, floor, status")
      .order("room_number")
      .then(({ data }) => setRooms(data || []))
  }, [])

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const roomCounts = data?.roomCounts || []
  const tasks = data?.tasks || []
  const staff = data?.staff || []
  const totalRooms = data?.totalRooms || 0
  const completedToday = data?.completedToday || 0

  const dirtyCount = roomCounts.find((r) => r.status === "dirty")?.count || 0
  const cleaningCount = roomCounts.find((r) => r.status === "cleaning")?.count || 0
  const availableCount = roomCounts.find((r) => r.status === "available")?.count || 0
  const maintenanceCount = roomCounts.find((r) => r.status === "maintenance")?.count || 0
  const occupiedCount = roomCounts.find((r) => r.status === "occupied")?.count || 0
  const inspectedCount = roomCounts.find((r) => r.status === "inspected")?.count || 0

  const pendingTasks = tasks.filter((t) => t.status === "pending")
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress")
  const unassignedTasks = tasks.filter((t) => !t.assigned_to)
  const urgentTasks = tasks.filter((t) => t.priority === "urgent" || t.priority === "high")

  const readyRooms = availableCount + inspectedCount
  const readyPercent = totalRooms > 0 ? Math.round((readyRooms / totalRooms) * 100) : 0
  const todayProgress = completedToday + tasks.length > 0
    ? Math.round((completedToday / (completedToday + tasks.length)) * 100)
    : 100

  const isSupervisor = profile.role === "housekeeping_supervisor" || profile.role === "system_admin"

  const filteredTasks = search
    ? tasks.filter(
        (t) =>
          t.rooms?.room_number?.toLowerCase().includes(search.toLowerCase()) ||
          t.assigned_profile?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          t.assigned_profile?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          t.task_type.toLowerCase().includes(search.toLowerCase())
      )
    : tasks

  const handleAssign = async () => {
    if (!selectedTask || !selectedStaff) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from("housekeeping_tasks")
      .update({
        assigned_to: selectedStaff,
        started_at: new Date().toISOString(),
        status: "in_progress",
      })
      .eq("id", selectedTask.id)
    if (selectedTask.room_id) {
      await supabase.from("rooms").update({ status: "cleaning" }).eq("id", selectedTask.room_id)
    }
    setSaving(false)
    setAssignDialogOpen(false)
    setSelectedTask(null)
    setSelectedStaff("")
    mutate()
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId)
    const supabase = createClient()
    const updateData: Record<string, string | null> = { status: newStatus }
    if (newStatus === "completed") {
      updateData.completed_at = new Date().toISOString()
      const task = tasks.find((t) => t.id === taskId)
      if (task?.room_id) {
        await supabase.from("rooms").update({ status: "inspected" }).eq("id", task.room_id)
      }
    }
    if (newStatus === "in_progress") {
      updateData.started_at = new Date().toISOString()
      const task = tasks.find((t) => t.id === taskId)
      if (!task?.assigned_to) {
        updateData.assigned_to = profile.id
      }
      if (task?.room_id) {
        await supabase.from("rooms").update({ status: "cleaning" }).eq("id", task.room_id)
      }
    }
    await supabase.from("housekeeping_tasks").update(updateData).eq("id", taskId)
    setUpdatingTask(null)
    mutate()
  }

  const handleCreateTask = async () => {
    if (!newTaskRoomId) return
    setSaving(true)
    const supabase = createClient()
    const staffId = newTaskStaff === "none" || !newTaskStaff ? null : newTaskStaff
    const insertData: Record<string, string | null> = {
      room_id: newTaskRoomId,
      task_type: newTaskType,
      priority: newTaskPriority,
      status: staffId ? "in_progress" : "pending",
      notes: newTaskNotes || null,
      assigned_to: staffId,
      started_at: staffId ? new Date().toISOString() : null,
      scheduled_date: new Date().toISOString().split("T")[0],
    }
    await supabase.from("housekeeping_tasks").insert(insertData)
    if (newTaskType.includes("cleaning") || newTaskType === "turndown") {
      await supabase.from("rooms").update({ status: staffId ? "cleaning" : "dirty" }).eq("id", newTaskRoomId)
    }
    setSaving(false)
    setNewTaskDialogOpen(false)
    setNewTaskRoomId("")
    setNewTaskType("standard_cleaning")
    setNewTaskPriority("medium")
    setNewTaskNotes("")
    setNewTaskStaff("")
    mutate()
  }

  const getTaskAge = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ${mins % 60}m`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ===== HEADER BAR ===== */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Housekeeping Command Center</h1>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            <span className="mx-2 text-border">|</span>
            <span className="font-mono">{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="mx-2 text-border">|</span>
            {profile.first_name} {profile.last_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-xs">
            <div className={`h-2 w-2 rounded-full ${isLoading ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            Auto-refresh 10s
          </Badge>
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isSupervisor && (
            <Button size="sm" onClick={() => setNewTaskDialogOpen(true)}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              New Task
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/housekeeping">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Full View
            </Link>
          </Button>
        </div>
      </div>

      {/* ===== URGENT ALERT ===== */}
      {urgentTasks.length > 0 && (
        <Card className="border-red-400 bg-red-50">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 animate-pulse">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">
                {urgentTasks.length} URGENT/HIGH task{urgentTasks.length > 1 ? "s" : ""} - Immediate action required
              </p>
              <p className="text-xs text-red-700">
                Rooms: {urgentTasks.map((t) => t.rooms?.room_number).filter(Boolean).join(", ")}
                {unassignedTasks.filter((t) => t.priority === "urgent" || t.priority === "high").length > 0 &&
                  ` (${unassignedTasks.filter((t) => t.priority === "urgent" || t.priority === "high").length} unassigned!)`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== KEY METRICS - Big, bold, scannable ===== */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        <Card className={`border-l-4 border-l-red-500 ${dirtyCount > 0 ? "bg-red-50/70" : ""}`}>
          <CardContent className="p-3 text-center">
            <p className={`text-3xl font-black ${dirtyCount > 0 ? "text-red-700" : "text-muted-foreground"}`}>{dirtyCount}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">Dirty</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 border-l-amber-500 ${cleaningCount > 0 ? "bg-amber-50/70" : ""}`}>
          <CardContent className="p-3 text-center">
            <p className={`text-3xl font-black ${cleaningCount > 0 ? "text-amber-700" : "text-muted-foreground"}`}>{cleaningCount}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Cleaning</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3 text-center">
            <p className="text-3xl font-black text-emerald-700">{readyRooms}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Ready</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 text-center">
            <p className="text-3xl font-black text-blue-700">{occupiedCount}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Occupied</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-3 text-center">
            <p className="text-3xl font-black text-slate-700">{maintenanceCount}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Maint.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-3 text-center">
            <p className="text-3xl font-black text-teal-700">{completedToday}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">Done Today</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== PROGRESS BARS ===== */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Room Readiness</span>
              <span className={`text-sm font-bold ${readyPercent >= 80 ? "text-emerald-600" : readyPercent >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {readyPercent}%
              </span>
            </div>
            <Progress value={readyPercent} className="h-3" />
            <p className="mt-1 text-xs text-muted-foreground">{readyRooms} of {totalRooms} rooms ready for guests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Today&apos;s Progress</span>
              <span className="text-sm font-bold text-primary">{todayProgress}%</span>
            </div>
            <Progress value={todayProgress} className="h-3" />
            <p className="mt-1 text-xs text-muted-foreground">
              {completedToday} completed, {pendingTasks.length} pending, {inProgressTasks.length} in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Quick search: room number, staff name, task type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ===== TASK COLUMNS - Kanban style ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* PENDING / UNASSIGNED */}
        <Card className={pendingTasks.length > 0 ? "border-amber-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
                <CircleDot className="h-3.5 w-3.5 text-amber-600" />
              </div>
              Pending
              <Badge variant="secondary" className="ml-auto">
                {pendingTasks.length}
              </Badge>
              {unassignedTasks.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {unassignedTasks.length} unassigned
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 max-h-[450px] overflow-y-auto">
            {filteredTasks
              .filter((t) => t.status === "pending")
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSupervisor={isSupervisor}
                  updatingTask={updatingTask}
                  onAssign={() => {
                    setSelectedTask(task)
                    setSelectedStaff("")
                    setAssignDialogOpen(true)
                  }}
                  onStatusChange={handleStatusChange}
                  profileId={profile.id}
                  getTaskAge={getTaskAge}
                />
              ))}
            {filteredTasks.filter((t) => t.status === "pending").length === 0 && (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <CheckCircle2 className="mb-2 h-8 w-8" />
                <p className="text-sm font-medium">All clear - no pending tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IN PROGRESS */}
        <Card className={inProgressTasks.length > 0 ? "border-blue-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                <Timer className="h-3.5 w-3.5 text-blue-600" />
              </div>
              In Progress
              <Badge variant="secondary" className="ml-auto">
                {inProgressTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 max-h-[450px] overflow-y-auto">
            {filteredTasks
              .filter((t) => t.status === "in_progress")
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSupervisor={isSupervisor}
                  updatingTask={updatingTask}
                  onAssign={() => {
                    setSelectedTask(task)
                    setSelectedStaff("")
                    setAssignDialogOpen(true)
                  }}
                  onStatusChange={handleStatusChange}
                  profileId={profile.id}
                  getTaskAge={getTaskAge}
                />
              ))}
            {filteredTasks.filter((t) => t.status === "in_progress").length === 0 && (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Clock className="mb-2 h-8 w-8" />
                <p className="text-sm font-medium">No active tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== STAFF WORKLOAD (supervisor) ===== */}
      {isSupervisor && staff.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staff Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((s) => {
                const assignedTasks = tasks.filter((t) => t.assigned_to === s.id)
                const activeCount = assignedTasks.length
                const hasUrgent = assignedTasks.some((t) => t.priority === "urgent" || t.priority === "high")
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      hasUrgent ? "border-red-200 bg-red-50/50" : activeCount > 4 ? "border-amber-200 bg-amber-50/50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{s.first_name} {s.last_name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {assignedTasks.slice(0, 4).map((t) => (
                            <span key={t.id} className={`inline-block h-2 w-2 rounded-full ${priorityConfig[t.priority]?.dotColor || "bg-gray-300"}`} title={`Room ${t.rooms?.room_number} - ${t.task_type}`} />
                          ))}
                          {assignedTasks.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{assignedTasks.length - 4}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={activeCount > 4 ? "destructive" : activeCount > 2 ? "secondary" : "outline"}
                        className="font-bold"
                      >
                        {activeCount}
                      </Badge>
                      {hasUrgent && (
                        <p className="mt-0.5 text-[10px] font-bold text-red-600">HAS URGENT</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== ASSIGN TASK DIALOG ===== */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Task
              {selectedTask?.rooms && <Badge variant="outline">Room {selectedTask.rooms.room_number}</Badge>}
            </DialogTitle>
            <DialogDescription>
              Choose a staff member to handle this task. They will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {selectedTask && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{taskTypeLabels[selectedTask.task_type] || selectedTask.task_type.replace(/_/g, " ")}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${priorityConfig[selectedTask.priority]?.class}`}>
                    {priorityConfig[selectedTask.priority]?.label}
                  </span>
                </div>
                {selectedTask.rooms?.room_type && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Floor {selectedTask.rooms.floor} - {selectedTask.rooms.room_type.name}
                  </p>
                )}
                {selectedTask.notes && (
                  <p className="mt-1 text-xs italic text-muted-foreground">{selectedTask.notes}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">Waiting: {getTaskAge(selectedTask.created_at)}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">Assign to</Label>
              <div className="flex flex-col gap-1.5">
                {staff.map((s) => {
                  const load = tasks.filter((t) => t.assigned_to === s.id).length
                  const isSelected = selectedStaff === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStaff(s.id)}
                      className={`flex items-center justify-between rounded-lg border-2 p-3 text-left transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-muted-foreground/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <span className="text-sm font-medium">{s.first_name} {s.last_name}</span>
                      </div>
                      <Badge variant={load > 3 ? "destructive" : load > 0 ? "secondary" : "outline"}>
                        {load} task{load !== 1 ? "s" : ""}
                      </Badge>
                    </button>
                  )
                })}
                {staff.length === 0 && (
                  <p className="py-3 text-center text-sm text-muted-foreground">No housekeeping staff available</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedStaff || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== NEW TASK DIALOG ===== */}
      <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Housekeeping Task</DialogTitle>
            <DialogDescription>Assign a new cleaning or service task to a room.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">Room</Label>
              <Select value={newTaskRoomId} onValueChange={setNewTaskRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room..." />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.room_number} (F{r.floor}) - {r.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Task Type</Label>
                <Select value={newTaskType} onValueChange={setNewTaskType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(taskTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="font-semibold">Priority</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">Assign to (optional)</Label>
              <Select value={newTaskStaff} onValueChange={setNewTaskStaff}>
                <SelectTrigger><SelectValue placeholder="Leave unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s) => {
                    const load = tasks.filter((t) => t.assigned_to === s.id).length
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({load} active)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">Notes</Label>
              <Textarea
                placeholder="Special instructions, guest requests, etc."
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!newTaskRoomId || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ===== TASK CARD ===== */
function TaskCard({
  task,
  isSupervisor,
  updatingTask,
  onAssign,
  onStatusChange,
  profileId,
  getTaskAge,
}: {
  task: HKTask
  isSupervisor: boolean
  updatingTask: string | null
  onAssign: () => void
  onStatusChange: (id: string, status: string) => void
  profileId: string
  getTaskAge: (createdAt: string) => string
}) {
  const pCfg = priorityConfig[task.priority] || priorityConfig.medium
  const isMyTask = task.assigned_to === profileId
  const age = getTaskAge(task.created_at)

  return (
    <div
      className={`rounded-lg border p-3 transition-colors hover:bg-muted/40 ${pCfg.ring} ${
        isMyTask ? "bg-primary/5 border-primary/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-lg font-black leading-none">{task.rooms?.room_number || "?"}</span>
            <span className="rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
              F{task.rooms?.floor}
            </span>
            {task.rooms?.room_type && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {task.rooms.room_type.name}
              </Badge>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${pCfg.class}`}>
              {pCfg.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-foreground">
            {taskTypeLabels[task.task_type] || task.task_type.replace(/_/g, " ")}
          </p>
          {task.notes && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground italic">{task.notes}</p>
          )}
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            {task.assigned_profile ? (
              <span className="font-semibold text-primary">
                {task.assigned_profile.first_name} {task.assigned_profile.last_name}
                {isMyTask && " (you)"}
              </span>
            ) : (
              <span className="font-semibold text-red-500">Unassigned</span>
            )}
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {age}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {task.status === "pending" && !task.assigned_to && isSupervisor && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAssign}>
              <UserPlus className="mr-1 h-3 w-3" />
              Assign
            </Button>
          )}
          {task.status === "pending" && (
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={updatingTask === task.id}
              onClick={() => onStatusChange(task.id, "in_progress")}
            >
              {updatingTask === task.id ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <ArrowRight className="mr-1 h-3 w-3" />
              )}
              Start
            </Button>
          )}
          {task.status === "in_progress" && (
            <Button
              size="sm"
              className="h-7 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              disabled={updatingTask === task.id}
              onClick={() => onStatusChange(task.id, "completed")}
            >
              {updatingTask === task.id ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              )}
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
