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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Loader2, GripVertical, UserPlus, User } from "lucide-react"

export interface HKTask {
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

type ColumnId = "pending" | "in_progress" | "completed"

const COLUMNS: Array<{ id: ColumnId; title: string; accent: string; bullet: string }> = [
  { id: "pending", title: "Очікує", accent: "border-amber-300 bg-amber-50/50", bullet: "bg-amber-500" },
  { id: "in_progress", title: "У роботі", accent: "border-blue-300 bg-blue-50/50", bullet: "bg-blue-500" },
  { id: "completed", title: "Виконано", accent: "border-emerald-300 bg-emerald-50/50", bullet: "bg-emerald-500" },
]

const priorityConfig: Record<string, { label: string; class: string; border: string }> = {
  urgent: { label: "Терміново", class: "bg-red-600 text-white", border: "border-l-red-600" },
  high: { label: "Високий", class: "bg-red-100 text-red-800", border: "border-l-red-400" },
  medium: { label: "Середній", class: "bg-amber-100 text-amber-800", border: "border-l-amber-400" },
  low: { label: "Низький", class: "bg-sky-100 text-sky-800", border: "border-l-sky-400" },
}

const TASK_TYPE_UK: Record<string, string> = {
  standard_cleaning: "Стандартне прибирання",
  deep_cleaning: "Глибоке прибирання",
  turndown: "Вечірнє обслуговування",
  inspection: "Перевірка",
  linen_change: "Зміна білизни",
  minibar_restock: "Поповнення мінібару",
  checkout_cleaning: "Прибирання після виїзду",
}

interface HousekeepingKanbanProps {
  tasks: HKTask[]
  currentProfileId: string
  isSupervisor: boolean
  onMoveTask: (taskId: string, nextStatus: ColumnId) => Promise<void>
  onAssignRequest: (task: HKTask) => void
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

function TaskCard({ task, dragging = false }: { task: HKTask; dragging?: boolean }) {
  const pCfg = priorityConfig[task.priority] || priorityConfig.medium
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
            {TASK_TYPE_UK[task.task_type] ?? task.task_type.replace(/_/g, " ")}
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
        </div>
      </CardContent>
    </Card>
  )
}

function DraggableTask({ task }: { task: HKTask }) {
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
      <TaskCard task={task} />
    </div>
  )
}

function Column({
  column,
  tasks,
  activeTaskStatus,
}: {
  column: (typeof COLUMNS)[number]
  tasks: HKTask[]
  activeTaskStatus: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const canAccept = activeTaskStatus ? canMove(activeTaskStatus, column.id) : true
  return (
    <div className="flex min-h-[400px] flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${column.bullet}`} />
        <h3 className="text-sm font-semibold">{column.title}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-2 transition-colors ${column.accent} ${
          isOver && canAccept ? "border-primary/60 bg-primary/5" : ""
        } ${isOver && !canAccept ? "border-destructive/60 bg-destructive/5" : ""}`}
      >
        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Немає завдань</p>
        )}
        {tasks.map((task) => (
          <DraggableTask key={task.id} task={task} />
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
  onAssignRequest,
}: HousekeepingKanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  const [activeTask, setActiveTask] = useState<HKTask | null>(null)
  const [pendingMove, setPendingMove] = useState<{ task: HKTask; next: ColumnId } | null>(null)
  const [moving, setMoving] = useState(false)
  const [showMine, setShowMine] = useState(false)

  const visibleTasks = useMemo(() => {
    if (!showMine) return tasks
    return tasks.filter((t) => t.assigned_to === currentProfileId)
  }, [tasks, showMine, currentProfileId])

  const grouped = useMemo(() => {
    const map: Record<ColumnId, HKTask[]> = { pending: [], in_progress: [], completed: [] }
    for (const t of visibleTasks) {
      if (t.status === "pending" || t.status === "assigned") map.pending.push(t)
      else if (t.status === "in_progress") map.in_progress.push(t)
      else if (t.status === "completed" || t.status === "inspected") map.completed.push(t)
    }
    return map
  }, [visibleTasks])

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
          Перетягуйте картки між колонками, щоб змінити статус. Завершення потребує підтвердження.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showMine ? "default" : "outline"}
            onClick={() => setShowMine((v) => !v)}
          >
            {showMine ? "Всі завдання" : "Тільки мої"}
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
              Підтвердіть, що завдання виконано. Номер буде позначений як «Готовий».
            </DialogDescription>
          </DialogHeader>
          {pendingMove && (
            <div className="rounded-lg border bg-muted p-3 text-sm">
              <p className="font-medium">№ {pendingMove.task.rooms?.room_number ?? "?"}</p>
              <p className="text-xs text-muted-foreground">
                {TASK_TYPE_UK[pendingMove.task.task_type] ?? pendingMove.task.task_type}
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
