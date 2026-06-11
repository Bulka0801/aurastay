"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarClock, CheckCircle2, Loader2, GripVertical, Search, UserPlus, User } from "lucide-react"
import { formatDateTime, formatTaskType } from "@/lib/localization"

export interface HKTask {
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
  inspected_at?: string | null
  updated_at?: string | null
  rooms: { room_number: string; floor: number; room_type: { name: string } | null } | null
  assigned_profile: { id: string; first_name: string; last_name: string } | null
}

type ColumnId = "pending" | "in_progress" | "completed"
type ScopeFilter = "all" | "mine" | "unassigned"
type SortMode = "ops" | "priority" | "oldest" | "newest" | "room" | "floor" | "assignee"

const COLUMNS: Array<{ id: ColumnId; title: string; accent: string; bullet: string }> = [
  { id: "pending", title: "Очікує", accent: "border-amber-300 bg-amber-50/50", bullet: "bg-amber-500" },
  { id: "in_progress", title: "У роботі", accent: "border-blue-300 bg-blue-50/50", bullet: "bg-blue-500" },
  { id: "completed", title: "На перевірці", accent: "border-emerald-300 bg-emerald-50/50", bullet: "bg-emerald-500" },
]

const COLUMN_HINTS: Record<ColumnId, string> = {
  pending: "Чекає призначення або старту.",
  in_progress: "Виконується зараз.",
  completed: "Завершено і готово до перевірки.",
}

const priorityConfig: Record<string, { label: string; class: string; border: string }> = {
  urgent: { label: "Терміновий", class: "bg-red-600 text-white", border: "border-l-red-600" },
  high: { label: "Високий", class: "bg-red-100 text-red-800", border: "border-l-red-400" },
  normal: { label: "Середній", class: "bg-amber-100 text-amber-800", border: "border-l-amber-400" },
  low: { label: "Низький", class: "bg-sky-100 text-sky-800", border: "border-l-sky-400" },
}

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const sortLabels: Record<SortMode, string> = {
  ops: "Операційно",
  priority: "За пріоритетом",
  oldest: "Найстаріші",
  newest: "Найновіші",
  room: "За номером",
  floor: "За поверхом",
  assignee: "За виконавцем",
}

interface HousekeepingKanbanProps {
  tasks: HKTask[]
  currentProfileId: string
  isSupervisor: boolean
  onMoveTask: (taskId: string, nextStatus: ColumnId) => Promise<void>
  onInspectTask: (taskId: string) => Promise<void>
  onAssignRequest: (task: HKTask) => void
  onTaskDetails?: (task: HKTask) => void
}

/** Валідні переходи для drag&drop. */
const VALID_TRANSITIONS: Record<string, ColumnId[]> = {
  pending: ["in_progress"],
  assigned: ["in_progress"],
  in_progress: ["completed", "pending"],
  completed: [],
  inspected: [],
}

function canMove(from: string, to: ColumnId) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

function normalize(value?: string | null) {
  return value?.toLocaleLowerCase("uk-UA") ?? ""
}

function roomNumberValue(task: HKTask) {
  return task.rooms?.room_number ?? ""
}

function roomFloorValue(task: HKTask) {
  return task.rooms?.floor ?? Number.MAX_SAFE_INTEGER
}

function createdTime(task: HKTask) {
  return new Date(task.created_at).getTime() || 0
}

function assigneeName(task: HKTask) {
  if (!task.assigned_profile) return "яяя"
  return `${task.assigned_profile.last_name} ${task.assigned_profile.first_name}`
}

function compareTasks(a: HKTask, b: HKTask, sortMode: SortMode) {
  const byPriority = (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99)
  const byCreatedOldest = createdTime(a) - createdTime(b)
  const byRoom = roomNumberValue(a).localeCompare(roomNumberValue(b), "uk-UA", { numeric: true })
  const byFloor = roomFloorValue(a) - roomFloorValue(b)
  const byAssignee = assigneeName(a).localeCompare(assigneeName(b), "uk-UA")

  switch (sortMode) {
    case "priority":
      return byPriority || byCreatedOldest || byRoom
    case "oldest":
      return byCreatedOldest || byPriority || byRoom
    case "newest":
      return createdTime(b) - createdTime(a) || byPriority || byRoom
    case "room":
      return byRoom || byPriority || byCreatedOldest
    case "floor":
      return byFloor || byRoom || byPriority || byCreatedOldest
    case "assignee":
      return byAssignee || byPriority || byCreatedOldest || byRoom
    case "ops":
    default:
      return byPriority || byCreatedOldest || byFloor || byRoom
  }
}

function TaskCard({
  task,
  dragging = false,
  isSupervisor = false,
  onInspectTask,
  onDetails,
}: {
  task: HKTask
  dragging?: boolean
  isSupervisor?: boolean
  onInspectTask?: (taskId: string) => void
  onDetails?: (task: HKTask) => void
}) {
  const pCfg = priorityConfig[task.priority] || priorityConfig.normal
  return (
    <Card
      className={`border-l-4 ${pCfg.border} ${dragging ? "opacity-80 shadow-lg ring-2 ring-primary/40" : "hover:shadow-sm"} transition-shadow`}
    >
      <CardContent className="flex items-start gap-2 p-3">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold">№ {task.rooms?.room_number ?? "?"}</span>
            {task.rooms?.floor !== undefined && (
              <span className="text-[10px] text-muted-foreground">поверх {task.rooms.floor}</span>
            )}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${pCfg.class}`}>
              {pCfg.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {formatTaskType(task.task_type)}
          </p>
          {task.notes && (
            <p className="mt-1 line-clamp-2 text-[11px] italic text-muted-foreground">{task.notes}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {task.assigned_profile ? (
              <Badge variant="secondary" className="text-[10px]">
                <User className="mr-1 h-2.5 w-2.5" />
                {task.assigned_profile.first_name} {task.assigned_profile.last_name[0]}.
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Не призначено
              </Badge>
            )}
            {task.rooms?.room_type && (
              <Badge variant="outline" className="text-[10px]">
                {task.rooms.room_type.name}
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Створено: {formatDateTime(task.created_at)}
            </span>
            {task.started_at && <span>Початок: {formatDateTime(task.started_at)}</span>}
          </div>
          {onDetails && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-6 px-2 text-xs"
              onClick={(event) => {
                event.stopPropagation()
                onDetails(task)
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              Деталі
            </Button>
          )}
          {isSupervisor && task.status === "completed" && onInspectTask && (
            <Button
              size="sm"
              className="mt-2 h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
              onClick={(event) => {
                event.stopPropagation()
                onInspectTask(task.id)
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Підтвердити
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DraggableTask({
  task,
  isSupervisor,
  onInspectTask,
  onDetails,
}: {
  task: HKTask
  isSupervisor: boolean
  onInspectTask: (taskId: string) => void
  onDetails?: (task: HKTask) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`touch-none ${isDragging ? "opacity-40" : ""}`}
    >
      <TaskCard task={task} isSupervisor={isSupervisor} onInspectTask={onInspectTask} onDetails={onDetails} />
    </div>
  )
}

function Column({
  column,
  tasks,
  activeTaskStatus,
  isSupervisor,
  onInspectTask,
  onTaskDetails,
}: {
  column: (typeof COLUMNS)[number]
  tasks: HKTask[]
  activeTaskStatus: string | null
  isSupervisor: boolean
  onInspectTask: (taskId: string) => void
  onTaskDetails?: (task: HKTask) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const canAccept = activeTaskStatus ? canMove(activeTaskStatus, column.id) : true
  return (
    <div className="flex min-h-[360px] flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${column.bullet}`} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{column.title}</h3>
          <p className="text-[11px] text-muted-foreground">{COLUMN_HINTS[column.id]}</p>
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex max-h-[32.5rem] flex-1 flex-col gap-2 overflow-y-auto overscroll-contain rounded-lg border-2 border-dashed p-2 pr-1 transition-colors ${column.accent} ${
          isOver && canAccept ? "border-primary/60 bg-primary/5" : ""
        } ${isOver && !canAccept ? "border-destructive/60 bg-destructive/5" : ""}`}
      >
        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Поки немає задач у цій колонці</p>
        )}
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} isSupervisor={isSupervisor} onInspectTask={onInspectTask} onDetails={onTaskDetails} />
        ))}
      </div>
    </div>
  )
}

export function HousekeepingKanban({
  tasks,
  currentProfileId,
  isSupervisor,
  onMoveTask,
  onInspectTask,
  onAssignRequest,
  onTaskDetails,
}: HousekeepingKanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const [activeTask, setActiveTask] = useState<HKTask | null>(null)
  const [pendingMove, setPendingMove] = useState<{ task: HKTask; next: ColumnId } | null>(null)
  const [moving, setMoving] = useState(false)
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>(isSupervisor ? "all" : "mine")
  const [sortMode, setSortMode] = useState<SortMode>("ops")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [floorFilter, setFloorFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [quickSearch, setQuickSearch] = useState("")

  const staffSafeTasks = useMemo(() => {
    if (isSupervisor) return tasks
    return tasks.filter((t) => t.assigned_to === currentProfileId)
  }, [tasks, isSupervisor, currentProfileId])

  const filterOptions = useMemo(() => {
    const floors = Array.from(
      new Set(staffSafeTasks.map((t) => t.rooms?.floor).filter((floor): floor is number => floor !== undefined)),
    ).sort((a, b) => a - b)
    const taskTypes = Array.from(new Set(staffSafeTasks.map((t) => t.task_type))).sort((a, b) =>
      formatTaskType(a).localeCompare(formatTaskType(b), "uk-UA"),
    )
    const assignees = Array.from(
      new Map(
        staffSafeTasks
          .filter((t) => t.assigned_to && t.assigned_profile)
          .map((t) => [
            t.assigned_to as string,
            {
              id: t.assigned_to as string,
              name: `${t.assigned_profile?.first_name ?? ""} ${t.assigned_profile?.last_name ?? ""}`.trim(),
            },
          ]),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name, "uk-UA"))
    return { floors, taskTypes, assignees }
  }, [staffSafeTasks])

  const visibleTasks = useMemo(() => {
    const query = normalize(quickSearch.trim())
    return staffSafeTasks
      .filter((t) => {
        if (scopeFilter === "mine" && t.assigned_to !== currentProfileId) return false
        if (scopeFilter === "unassigned" && t.assigned_to) return false
        if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
        if (typeFilter !== "all" && t.task_type !== typeFilter) return false
        if (floorFilter !== "all" && String(t.rooms?.floor ?? "") !== floorFilter) return false
        if (assigneeFilter === "unassigned" && t.assigned_to) return false
        if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && t.assigned_to !== assigneeFilter) return false
        if (!query) return true

        const haystack = [
          t.rooms?.room_number,
          t.rooms?.room_type?.name,
          formatTaskType(t.task_type),
          t.priority,
          t.notes,
          t.assigned_profile?.first_name,
          t.assigned_profile?.last_name,
        ]
          .map(normalize)
          .join(" ")

        return haystack.includes(query)
      })
      .sort((a, b) => compareTasks(a, b, sortMode))
  }, [
    staffSafeTasks,
    scopeFilter,
    currentProfileId,
    priorityFilter,
    typeFilter,
    floorFilter,
    assigneeFilter,
    quickSearch,
    sortMode,
  ])

  const grouped = useMemo(() => {
    const map: Record<ColumnId, HKTask[]> = { pending: [], in_progress: [], completed: [] }
    for (const t of visibleTasks) {
      if (t.status === "pending" || t.status === "assigned") map.pending.push(t)
      else if (t.status === "in_progress") map.in_progress.push(t)
      else if (t.status === "completed") map.completed.push(t)
    }
    return map
  }, [visibleTasks])

  const activeFilterCount = [
    priorityFilter !== "all",
    typeFilter !== "all",
    floorFilter !== "all",
    assigneeFilter !== "all",
    quickSearch.trim().length > 0,
    isSupervisor && scopeFilter !== "all",
  ].filter(Boolean).length

  const resetFilters = () => {
    setScopeFilter(isSupervisor ? "all" : "mine")
    setPriorityFilter("all")
    setTypeFilter("all")
    setFloorFilter("all")
    setAssigneeFilter("all")
    setQuickSearch("")
    setSortMode("ops")
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { task?: HKTask } | undefined
    setActiveTask(data?.task ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const active = event.active.data.current as { task?: HKTask } | undefined
    const overId = event.over?.id as ColumnId | undefined
    setActiveTask(null)
    if (!active?.task || !overId) return
    const task = active.task
    if (!canMove(task.status, overId)) return
    // Confirmation for Completed transitions
    if (overId === "completed") {
      setPendingMove({ task, next: overId })
      return
    }
    void doMove(task, overId)
  }

  const doMove = async (task: HKTask, next: ColumnId) => {
    setMoving(true)
    try {
      await onMoveTask(task.id, next)
    } finally {
      setMoving(false)
      setPendingMove(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {isSupervisor
            ? "Перетягни задачу в потрібну колонку. У виконаних задачах можна одразу підтвердити перевірку."
            : "Ви бачите тільки задачі, призначені вам."}
        </p>
        <Badge variant="outline" className="text-xs">
          Показано {visibleTasks.length} з {staffSafeTasks.length}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Пошук: номер, тип, виконавець..."
              className="h-9 pl-8"
            />
          </div>

          {isSupervisor && (
            <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ScopeFilter)}>
              <SelectTrigger className="h-9 w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі задачі</SelectItem>
                <SelectItem value="mine">Тільки мої</SelectItem>
                <SelectItem value="unassigned">Без виконавця</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-9 w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {sortLabels[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-full min-w-0">
              <SelectValue placeholder="Пріоритет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі пріоритети</SelectItem>
              <SelectItem value="urgent">Терміновий</SelectItem>
              <SelectItem value="high">Високий</SelectItem>
              <SelectItem value="normal">Середній</SelectItem>
              <SelectItem value="low">Низький</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-full min-w-0">
              <SelectValue className="min-w-0 flex-1 truncate" placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі типи</SelectItem>
              {filterOptions.taskTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatTaskType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="h-9 w-full min-w-0">
              <SelectValue placeholder="Поверх" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі поверхи</SelectItem>
              {filterOptions.floors.map((floor) => (
                <SelectItem key={floor} value={String(floor)}>
                  Поверх {floor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isSupervisor && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-9 w-full min-w-0">
                <SelectValue placeholder="Виконавець" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі виконавці</SelectItem>
                <SelectItem value="unassigned">Без виконавця</SelectItem>
                {filterOptions.assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Сортування: {sortLabels[sortMode]}. У колонках зберігається однаковий порядок.
          </p>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetFilters} disabled={activeFilterCount === 0 && sortMode === "ops"}>
            Скинути
            {activeFilterCount > 0 && <span className="ml-1 rounded bg-muted px-1">{activeFilterCount}</span>}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={grouped[col.id]}
              activeTaskStatus={activeTask?.status ?? null}
              isSupervisor={isSupervisor}
              onInspectTask={(taskId) => {
                void onInspectTask(taskId)
              }}
              onTaskDetails={onTaskDetails}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {activeTask ? <TaskCard task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Quick list for unassigned items (helps supervisor assign) */}
      {isSupervisor && grouped.pending.some((t) => !t.assigned_to) && (
        <div className="rounded-lg border bg-amber-50/60 p-3">
          <p className="mb-2 text-xs font-semibold text-amber-900">
            Непризначені завдання (потребують призначення покоївки):
          </p>
          <div className="flex flex-wrap gap-2">
            {grouped.pending
              .filter((t) => !t.assigned_to)
              .map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAssignRequest(t)}
                >
                  <UserPlus className="mr-1 h-3 w-3" />№ {t.rooms?.room_number}
                </Button>
              ))}
          </div>
        </div>
      )}

      <Dialog open={!!pendingMove} onOpenChange={(o) => !o && setPendingMove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердити завершення</DialogTitle>
            <DialogDescription>
              Підтвердіть, що роботу виконано. Після цього задача піде на перевірку супервайзера.
            </DialogDescription>
          </DialogHeader>
          {pendingMove && (
            <div className="rounded-lg border bg-muted p-3 text-sm">
              <p className="font-medium">№ {pendingMove.task.rooms?.room_number ?? "?"}</p>
              <p className="text-xs text-muted-foreground">
                {formatTaskType(pendingMove.task.task_type)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingMove(null)} disabled={moving}>
              Скасувати
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => pendingMove && doMove(pendingMove.task, pendingMove.next)}
              disabled={moving}
            >
              {moving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Підтвердити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
