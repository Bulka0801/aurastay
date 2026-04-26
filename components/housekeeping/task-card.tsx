"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatPriority, formatTaskStatus, formatTaskType } from "@/lib/localization"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  MoreHorizontal,
  Pause,
  PlayCircle,
  UserPlus,
} from "lucide-react"
import type { HKTask } from "./types"

interface Props {
  task: HKTask
  isMine: boolean
  isSupervisor: boolean
  busy?: boolean
  compact?: boolean
  onOpen: (task: HKTask) => void
  onStart?: (task: HKTask) => void
  onPause?: (task: HKTask) => void
  onResume?: (task: HKTask) => void
  onComplete?: (task: HKTask) => void
  onAssign?: (task: HKTask) => void
  onInspect?: (task: HKTask) => void
}

const priorityBorder: Record<string, string> = {
  urgent: "border-l-red-600",
  high: "border-l-amber-500",
  medium: "border-l-sky-500",
  low: "border-l-slate-400",
}

const priorityBadge: Record<string, string> = {
  urgent: "bg-red-600 text-white border-transparent",
  high: "bg-amber-100 text-amber-800 border-transparent",
  medium: "bg-sky-100 text-sky-800 border-transparent",
  low: "bg-slate-100 text-slate-700 border-transparent",
}

function durationLabel(task: HKTask): string | null {
  if (task.completed_at && task.actual_minutes) {
    return `${task.actual_minutes} хв`
  }
  if (task.status === "in_progress" && task.started_at) {
    const mins = Math.max(0, Math.round((Date.now() - new Date(task.started_at).getTime()) / 60000))
    return `${mins} хв`
  }
  if (task.estimated_minutes) {
    return `~${task.estimated_minutes} хв`
  }
  return null
}

export function TaskCard({
  task,
  isMine,
  isSupervisor,
  busy,
  compact,
  onOpen,
  onStart,
  onPause,
  onResume,
  onComplete,
  onAssign,
  onInspect,
}: Props) {
  const dur = durationLabel(task)
  const checklist = task.checklist || []
  const doneCount = checklist.filter((c) => c.is_done).length

  return (
    <Card
      className={`border-l-4 ${priorityBorder[task.priority] ?? priorityBorder.medium} ${
        isMine ? "bg-primary/5" : "bg-card"
      } shadow-sm hover:shadow-md transition-shadow`}
    >
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="block w-full p-3 text-left"
        aria-label={`Відкрити завдання для номера ${task.rooms?.room_number}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-base font-bold tracking-tight">
                {task.rooms?.room_number ?? "?"}
              </span>
              {task.rooms?.floor != null && (
                <span className="text-xs text-muted-foreground">пов. {task.rooms.floor}</span>
              )}
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  priorityBadge[task.priority] ?? priorityBadge.medium
                }`}
              >
                {formatPriority(task.priority)}
              </span>
              {task.dnd && (
                <Badge variant="outline" className="gap-1 border-amber-400 text-[10px] text-amber-700">
                  <AlertTriangle className="h-3 w-3" /> DND
                </Badge>
              )}
              {task.service_refused && (
                <Badge variant="outline" className="border-rose-400 text-[10px] text-rose-700">
                  Відмова
                </Badge>
              )}
            </div>

            <p className="mt-1 truncate text-sm text-foreground">{formatTaskType(task.task_type)}</p>

            {!compact && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {task.assigned_profile && (
                  <span className={isMine ? "font-medium text-primary" : ""}>
                    {task.assigned_profile.first_name} {task.assigned_profile.last_name}
                    {isMine && " (ви)"}
                  </span>
                )}
                {dur && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {dur}
                  </span>
                )}
                {checklist.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <ClipboardCheck className="h-3 w-3" />
                    {doneCount}/{checklist.length}
                  </span>
                )}
                {task.rooms?.room_type && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                    {task.rooms.room_type.name}
                  </span>
                )}
              </div>
            )}

            {task.notes && !compact && (
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>
            )}
          </div>

          <Badge
            variant={task.status === "completed" ? "default" : "secondary"}
            className="shrink-0 text-[10px]"
          >
            {formatTaskStatus(task.status)}
          </Badge>
        </div>
      </button>

      <div className="flex flex-wrap gap-1.5 border-t border-border bg-muted/30 px-3 py-2">
        {(task.status === "planned" || task.status === "pending" || task.status === "assigned") && onStart && (
          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => onStart(task)}>
            {busy ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <PlayCircle className="mr-1 h-3 w-3" />
            )}
            Почати
          </Button>
        )}
        {task.status === "in_progress" && (
          <>
            {onComplete && (
              <Button
                size="sm"
                className="h-7 bg-emerald-600 text-xs hover:bg-emerald-700"
                disabled={busy}
                onClick={() => onComplete(task)}
              >
                {busy ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                )}
                Завершити
              </Button>
            )}
            {onPause && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onPause(task)}>
                <Pause className="mr-1 h-3 w-3" /> Пауза
              </Button>
            )}
          </>
        )}
        {(task.status === "paused" || task.status === "on_hold") && onResume && (
          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={() => onResume(task)}>
            <PlayCircle className="mr-1 h-3 w-3" /> Продовжити
          </Button>
        )}
        {task.status === "completed" && onInspect && isSupervisor && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onInspect(task)}>
            <ClipboardCheck className="mr-1 h-3 w-3" /> Інспекція
          </Button>
        )}
        {!task.assigned_to && isSupervisor && onAssign && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAssign(task)}>
            <UserPlus className="mr-1 h-3 w-3" /> Призначити
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 px-2 text-xs"
          onClick={() => onOpen(task)}
          aria-label="Деталі"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  )
}
