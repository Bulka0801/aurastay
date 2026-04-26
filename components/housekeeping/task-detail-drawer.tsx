"use client"

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquareWarning,
  Pause,
  PlayCircle,
  PauseOctagon,
} from "lucide-react"
import {
  formatPriority,
  formatTaskStatus,
  formatTaskType,
  formatDateTime,
} from "@/lib/localization"
import {
  completeTask,
  fetchChecklist,
  holdTask,
  pauseTask,
  resumeTask,
  startTask,
  toggleChecklistItem,
} from "./data"
import type { ChecklistItem, HKTask } from "./types"

interface Props {
  task: HKTask | null
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMutated: () => void
}

export function TaskDetailDrawer({ task, userId, open, onOpenChange, onMutated }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [holdMode, setHoldMode] = useState<null | "dnd" | "service_refused">(null)
  const [holdNote, setHoldNote] = useState("")

  useEffect(() => {
    if (!open || !task) return
    setLoading(true)
    fetchChecklist(task.id).then((d) => {
      setItems(d)
      setLoading(false)
    })
    setHoldMode(null)
    setHoldNote("")
  }, [open, task])

  if (!task) return null

  const requiredCount = items.filter((i) => i.is_required).length
  const requiredDone = items.filter((i) => i.is_required && i.is_done).length
  const allRequiredDone = requiredCount === 0 || requiredDone === requiredCount
  const doneCount = items.filter((i) => i.is_done).length

  async function handleToggle(item: ChecklistItem, val: boolean) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_done: val, done_at: val ? new Date().toISOString() : null } : i)),
    )
    await toggleChecklistItem(item.id, val, userId)
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
      onMutated()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl">Номер {task.rooms?.room_number ?? "—"}</SheetTitle>
            <Badge variant="secondary">{formatTaskStatus(task.status)}</Badge>
          </div>
          <SheetDescription className="space-y-1 text-left">
            <span className="block">
              {formatTaskType(task.task_type)} · поверх {task.rooms?.floor ?? "—"}
            </span>
            <span className="block">
              Пріоритет:{" "}
              <span className="font-medium text-foreground">{formatPriority(task.priority)}</span>
            </span>
            {task.assigned_profile && (
              <span className="block">
                Виконавець:{" "}
                <span className="font-medium text-foreground">
                  {task.assigned_profile.first_name} {task.assigned_profile.last_name}
                </span>
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <div>
            <p className="text-muted-foreground">Заплановано</p>
            <p className="font-medium">{task.scheduled_date || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Орієнтовно</p>
            <p className="font-medium">{task.estimated_minutes ? `${task.estimated_minutes} хв` : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Початок</p>
            <p className="font-medium">{task.started_at ? new Date(task.started_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
          </div>
        </div>

        {task.notes && (
          <div className="mt-3 rounded-lg border border-border bg-amber-50 p-3 text-sm text-amber-900">
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <MessageSquareWarning className="h-3.5 w-3.5" />
              Примітки
            </p>
            <p>{task.notes}</p>
          </div>
        )}

        <Separator className="my-4" />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <ClipboardList className="h-4 w-4" />
              Чек-лист
            </h3>
            <span className="text-xs text-muted-foreground">
              {doneCount}/{items.length}{requiredCount > 0 && ` · обов'язкових ${requiredDone}/${requiredCount}`}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              Чек-лист не задано
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((it) => (
                <li
                  key={it.id}
                  className={`flex items-start gap-2.5 rounded-md border border-transparent p-2 transition-colors ${
                    it.is_done ? "bg-emerald-50/60" : "hover:bg-muted"
                  }`}
                >
                  <Checkbox
                    id={`chk-${it.id}`}
                    checked={it.is_done}
                    onCheckedChange={(v) => handleToggle(it, !!v)}
                    className="mt-0.5"
                    disabled={task.status === "completed"}
                  />
                  <label
                    htmlFor={`chk-${it.id}`}
                    className={`min-w-0 flex-1 cursor-pointer text-sm leading-snug ${
                      it.is_done ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {it.label}
                    {it.is_required && (
                      <span className="ml-1 rounded bg-rose-100 px-1 text-[10px] font-medium text-rose-700">
                        обов&apos;язково
                      </span>
                    )}
                    {it.done_at && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" /> {new Date(it.done_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {holdMode !== null && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <Label className="text-sm font-medium text-amber-900">
              {holdMode === "dnd" ? "Гість попросив не турбувати" : "Гість відмовився від сервісу"}
            </Label>
            <Textarea
              className="mt-2 bg-card"
              rows={2}
              placeholder="Коментар (необов'язково)"
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await holdTask(task.id, {
                      dnd: holdMode === "dnd",
                      service_refused: holdMode === "service_refused",
                      notes: holdNote || null,
                    })
                    setHoldMode(null)
                    onOpenChange(false)
                  })
                }
              >
                Підтвердити
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setHoldMode(null)}>
                Скасувати
              </Button>
            </div>
          </div>
        )}

        <SheetFooter className="mt-4 flex flex-col gap-2 sm:flex-col">
          {task.status === "planned" || task.status === "pending" || task.status === "assigned" ? (
            <Button
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await startTask(task.id, userId)
                })
              }
            >
              <PlayCircle className="mr-1.5 h-4 w-4" /> Почати прибирання
            </Button>
          ) : null}

          {task.status === "in_progress" && (
            <>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
                disabled={busy || !allRequiredDone}
                onClick={() =>
                  run(async () => {
                    await completeTask(task.id)
                    onOpenChange(false)
                  })
                }
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Завершити
                {!allRequiredDone && (
                  <span className="ml-1.5 text-[10px] opacity-90">(обов&apos;язкові не виконані)</span>
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await pauseTask(task.id)
                    })
                  }
                >
                  <Pause className="mr-1.5 h-4 w-4" /> Пауза
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setHoldMode("dnd")}>
                  <PauseOctagon className="mr-1.5 h-4 w-4" /> DND / Відмова
                </Button>
              </div>
            </>
          )}

          {(task.status === "paused" || task.status === "on_hold") && (
            <Button
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await resumeTask(task.id)
                })
              }
            >
              <PlayCircle className="mr-1.5 h-4 w-4" /> Продовжити
            </Button>
          )}

          {task.completed_at && (
            <p className="text-center text-xs text-muted-foreground">
              Завершено {formatDateTime(task.completed_at)}
              {task.actual_minutes && ` · ${task.actual_minutes} хв`}
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
