"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { formatPriority, formatTaskType } from "@/lib/localization"
import { assignTask } from "./data"
import type { HKTask, StaffMember } from "./types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: HKTask | null
  staff: StaffMember[]
  tasks: HKTask[]
  onAssigned: () => void
}

export function AssignDialog({ open, onOpenChange, task, staff, tasks, onAssigned }: Props) {
  const [staffId, setStaffId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setStaffId(task?.assigned_to ?? "")
  }, [open, task])

  if (!task) return null

  async function handleSubmit() {
    if (!task) return
    setSaving(true)
    try {
      await assignTask(task.id, staffId || null)
      onAssigned()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Призначити завдання — номер {task.rooms?.room_number ?? "—"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-md bg-muted p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Тип:</span> {formatTaskType(task.task_type)}
            </p>
            <p>
              <span className="text-muted-foreground">Пріоритет:</span> {formatPriority(task.priority)}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Виконавець</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть працівника..." />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => {
                  const load = tasks.filter(
                    (t) => t.assigned_to === s.id && t.status !== "completed" && t.status !== "cancelled",
                  ).length
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} · {load} активних
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} disabled={!staffId || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Призначити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
