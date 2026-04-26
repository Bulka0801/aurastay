"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, ClipboardList, Coffee, Sparkles } from "lucide-react"
import { TaskCard } from "./task-card"
import type { HKTask } from "./types"

interface Props {
  tasks: HKTask[]
  userId: string
  filter: "today" | "in_progress" | "completed"
  onFilterChange: (f: "today" | "in_progress" | "completed") => void
  busyId: string | null
  onOpen: (t: HKTask) => void
  onStart: (t: HKTask) => void
  onPause: (t: HKTask) => void
  onResume: (t: HKTask) => void
  onComplete: (t: HKTask) => void
}

export function StaffTaskList({
  tasks,
  userId,
  filter,
  onFilterChange,
  busyId,
  onOpen,
  onStart,
  onPause,
  onResume,
  onComplete,
}: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const myTasks = tasks.filter((t) => t.assigned_to === userId)

  const visible = myTasks.filter((t) => {
    if (filter === "in_progress") return t.status === "in_progress" || t.status === "paused"
    if (filter === "completed") return t.status === "completed"
    // today: planned/assigned/in_progress today
    return (
      (t.scheduled_date === today || !t.scheduled_date) &&
      t.status !== "completed" &&
      t.status !== "cancelled"
    )
  })

  const todayCount = myTasks.filter(
    (t) => (t.scheduled_date === today || !t.scheduled_date) && t.status !== "completed" && t.status !== "cancelled",
  ).length
  const progressCount = myTasks.filter((t) => t.status === "in_progress" || t.status === "paused").length
  const doneCount = myTasks.filter(
    (t) => t.status === "completed" && t.completed_at?.slice(0, 10) === today,
  ).length

  return (
    <div className="flex flex-col gap-3">
      <Card className="grid grid-cols-3 divide-x divide-border overflow-hidden">
        <button
          type="button"
          onClick={() => onFilterChange("today")}
          className={`flex flex-col items-center gap-1 p-4 transition-colors ${
            filter === "today" ? "bg-primary/10" : "hover:bg-muted/40"
          }`}
        >
          <ClipboardList className="h-5 w-5 text-primary" />
          <span className="text-xl font-bold leading-none">{todayCount}</span>
          <span className="text-[11px] text-muted-foreground">Сьогодні</span>
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("in_progress")}
          className={`flex flex-col items-center gap-1 p-4 transition-colors ${
            filter === "in_progress" ? "bg-amber-50" : "hover:bg-muted/40"
          }`}
        >
          <Sparkles className="h-5 w-5 text-amber-600" />
          <span className="text-xl font-bold leading-none">{progressCount}</span>
          <span className="text-[11px] text-muted-foreground">У процесі</span>
        </button>
        <button
          type="button"
          onClick={() => onFilterChange("completed")}
          className={`flex flex-col items-center gap-1 p-4 transition-colors ${
            filter === "completed" ? "bg-emerald-50" : "hover:bg-muted/40"
          }`}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-xl font-bold leading-none">{doneCount}</span>
          <span className="text-[11px] text-muted-foreground">Виконано</span>
        </button>
      </Card>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <Coffee className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Завдань немає</p>
          <p className="text-xs text-muted-foreground">
            {filter === "completed" ? "Сьогодні поки що нічого не завершено." : "Зараз для вас немає активних завдань."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              isMine
              isSupervisor={false}
              busy={busyId === t.id}
              onOpen={onOpen}
              onStart={onStart}
              onPause={onPause}
              onResume={onResume}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}

      {myTasks.length === 0 && (
        <Button variant="ghost" className="text-xs text-muted-foreground" disabled>
          Жодне завдання ще не призначено
        </Button>
      )}
    </div>
  )
}
