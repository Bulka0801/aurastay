"use client"

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ClipboardList } from "lucide-react"
import { formatTaskStatus } from "@/lib/localization"
import { TaskCard } from "./task-card"
import { KANBAN_COLUMNS, type HKTask } from "./types"

interface Props {
  tasks: HKTask[]
  userId: string
  isSupervisor: boolean
  busyId: string | null
  onOpen: (t: HKTask) => void
  onStart: (t: HKTask) => void
  onPause: (t: HKTask) => void
  onResume: (t: HKTask) => void
  onComplete: (t: HKTask) => void
  onAssign: (t: HKTask) => void
  onInspect: (t: HKTask) => void
}

const COLUMN_TONE: Record<string, string> = {
  planned: "border-t-slate-400",
  assigned: "border-t-sky-500",
  in_progress: "border-t-amber-500",
  paused: "border-t-rose-500",
  completed: "border-t-emerald-500",
}

export function KanbanBoard({
  tasks,
  userId,
  isSupervisor,
  busyId,
  onOpen,
  onStart,
  onPause,
  onResume,
  onComplete,
  onAssign,
  onInspect,
}: Props) {
  const grouped = KANBAN_COLUMNS.map((col) => ({
    ...col,
    items: tasks.filter((t) => col.matches.includes(t.status)),
  }))

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {grouped.map((col) => (
        <div
          key={col.key}
          className={`flex min-h-[200px] flex-col rounded-xl border-2 border-t-[6px] ${
            COLUMN_TONE[col.key] ?? "border-t-slate-400"
          } border-border bg-card p-2`}
        >
          <header className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold">{formatTaskStatus(col.key)}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {col.items.length}
            </span>
          </header>
          <div className="flex flex-1 flex-col gap-2">
            {col.items.length === 0 ? (
              <Empty className="border-0 bg-transparent py-6 text-muted-foreground">
                <EmptyHeader>
                  <ClipboardList className="h-6 w-6 opacity-50" />
                </EmptyHeader>
                <EmptyTitle className="text-xs">Порожньо</EmptyTitle>
                <EmptyDescription className="hidden text-[10px] sm:block">
                  Завдання у статусі &quot;{formatTaskStatus(col.key)}&quot; з&apos;являться тут
                </EmptyDescription>
              </Empty>
            ) : (
              col.items.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  isMine={t.assigned_to === userId}
                  isSupervisor={isSupervisor}
                  busy={busyId === t.id}
                  compact
                  onOpen={onOpen}
                  onStart={onStart}
                  onPause={onPause}
                  onResume={onResume}
                  onComplete={onComplete}
                  onAssign={onAssign}
                  onInspect={onInspect}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
