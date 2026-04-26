"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  formatPriority,
  formatRoomStatus,
  formatTaskType,
  housekeepingTaskTypeLabels,
} from "@/lib/localization"
import { TASK_CHECKLIST_PRESETS, type Room, type StaffMember } from "./types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rooms: Room[]
  staff: StaffMember[]
  userId: string
  defaultRoomId?: string
  onCreated: () => void
}

const TASK_TYPE_KEYS = Object.keys(housekeepingTaskTypeLabels)

const ESTIMATED_BY_TYPE: Record<string, number> = {
  standard_cleaning: 30,
  checkout_cleaning: 45,
  stayover_cleaning: 20,
  deep_cleaning: 90,
  turndown: 10,
  inspection: 10,
  linen_change: 15,
  minibar_check: 5,
  minibar_restock: 10,
  amenity_restock: 10,
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  rooms,
  staff,
  userId,
  defaultRoomId,
  onCreated,
}: Props) {
  const [roomIds, setRoomIds] = useState<string[]>([])
  const [taskType, setTaskType] = useState<string>("standard_cleaning")
  const [priority, setPriority] = useState<string>("medium")
  const [scheduledDate, setScheduledDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30)
  const [staffId, setStaffId] = useState<string>("none")
  const [notes, setNotes] = useState("")
  const [checklist, setChecklist] = useState<{ label: string; required: boolean }[]>([])
  const [newItem, setNewItem] = useState("")
  const [saving, setSaving] = useState(false)

  // When dialog opens, reset fields
  useEffect(() => {
    if (!open) return
    setRoomIds(defaultRoomId ? [defaultRoomId] : [])
    setTaskType("standard_cleaning")
    setPriority("medium")
    setScheduledDate(new Date().toISOString().slice(0, 10))
    setEstimatedMinutes(ESTIMATED_BY_TYPE.standard_cleaning)
    setStaffId("none")
    setNotes("")
    setChecklist((TASK_CHECKLIST_PRESETS.standard_cleaning ?? []).map((label) => ({ label, required: false })))
    setNewItem("")
  }, [open, defaultRoomId])

  // When task type changes, refresh preset checklist + estimate
  useEffect(() => {
    if (!open) return
    setEstimatedMinutes(ESTIMATED_BY_TYPE[taskType] ?? 30)
    setChecklist((TASK_CHECKLIST_PRESETS[taskType] ?? []).map((label) => ({ label, required: false })))
  }, [taskType, open])

  const selectedRooms = useMemo(
    () => rooms.filter((r) => roomIds.includes(r.id)),
    [rooms, roomIds],
  )

  function toggleRoom(id: string) {
    setRoomIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  function addChecklistItem() {
    const v = newItem.trim()
    if (!v) return
    setChecklist((c) => [...c, { label: v, required: false }])
    setNewItem("")
  }

  function removeChecklistItem(idx: number) {
    setChecklist((c) => c.filter((_, i) => i !== idx))
  }

  function toggleRequired(idx: number) {
    setChecklist((c) => c.map((it, i) => (i === idx ? { ...it, required: !it.required } : it)))
  }

  async function handleSave() {
    if (roomIds.length === 0) return
    setSaving(true)
    try {
      const supabase = createClient()
      const finalStaffId = staffId === "none" ? null : staffId
      const baseStatus: string = finalStaffId ? "assigned" : "planned"

      const rows = roomIds.map((roomId) => ({
        room_id: roomId,
        task_type: taskType,
        priority,
        status: baseStatus,
        notes: notes || null,
        scheduled_date: scheduledDate,
        estimated_minutes: estimatedMinutes,
        assigned_to: finalStaffId,
        assigned_at: finalStaffId ? new Date().toISOString() : null,
        created_by: userId,
      }))

      const { data: created, error } = await supabase
        .from("housekeeping_tasks")
        .insert(rows)
        .select("id")

      if (error) {
        console.log("[v0] create task error:", error.message)
        setSaving(false)
        return
      }

      // Insert the same checklist for each created task
      if (created && checklist.length > 0) {
        const flat = created.flatMap((c) =>
          checklist.map((it, position) => ({
            task_id: (c as { id: string }).id,
            label: it.label,
            position,
            is_required: it.required,
          })),
        )
        await supabase.from("housekeeping_task_checklist_items").insert(flat)
      }

      // For cleaning tasks, mark rooms as dirty (or cleaning if assigned & started later)
      if (taskType.includes("cleaning")) {
        await supabase.from("rooms").update({ status: "dirty" }).in("id", roomIds)
      }

      onCreated()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const cleanableRooms = rooms.filter((r) => r.status !== "blocked")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Створити завдання прибирання</DialogTitle>
          <DialogDescription>
            Заплануйте прибирання, оберіть номери, призначте виконавця та налаштуйте чек-лист.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Rooms */}
          <div className="space-y-2">
            <Label>Номери ({roomIds.length} обрано)</Label>
            {selectedRooms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedRooms.map((r) => (
                  <Badge key={r.id} variant="secondary" className="gap-1">
                    {r.room_number}
                    <button
                      type="button"
                      onClick={() => toggleRoom(r.id)}
                      aria-label={`Прибрати номер ${r.room_number}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto rounded-md border border-border">
              <ul className="divide-y divide-border">
                {cleanableRooms.map((r) => {
                  const checked = roomIds.includes(r.id)
                  return (
                    <li key={r.id}>
                      <label
                        htmlFor={`room-${r.id}`}
                        className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted ${
                          checked ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`room-${r.id}`}
                            checked={checked}
                            onCheckedChange={() => toggleRoom(r.id)}
                          />
                          <span className="font-medium">{r.room_number}</span>
                          <span className="text-xs text-muted-foreground">пов. {r.floor}</span>
                          {r.room_type && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {r.room_type.name}
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {formatRoomStatus(r.status)}
                        </Badge>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Тип завдання</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {formatTaskType(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Пріоритет</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">{formatPriority("urgent")}</SelectItem>
                  <SelectItem value="high">{formatPriority("high")}</SelectItem>
                  <SelectItem value="medium">{formatPriority("medium")}</SelectItem>
                  <SelectItem value="low">{formatPriority("low")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Орієнтовно (хв)</Label>
              <Input
                type="number"
                min={5}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 30)}
              />
            </div>
            <div className="space-y-2">
              <Label>Виконавець</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не призначати</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Примітки</Label>
            <Textarea
              rows={2}
              placeholder="Особливі інструкції, побажання гостя тощо"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Checklist editor */}
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <Label>Чек-лист ({checklist.length})</Label>
              <span className="text-xs text-muted-foreground">
                Натисніть на пункт, щоб позначити як обов&apos;язковий
              </span>
            </div>
            <ul className="space-y-1">
              {checklist.map((it, i) => (
                <li
                  key={`${it.label}-${i}`}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => toggleRequired(i)}
                    className={`flex-1 truncate text-left text-sm ${
                      it.required ? "font-medium text-rose-700" : ""
                    }`}
                  >
                    {it.label}
                    {it.required && (
                      <span className="ml-1 rounded bg-rose-100 px-1 text-[10px] text-rose-700">
                        обов&apos;язково
                      </span>
                    )}
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removeChecklistItem(i)}
                    aria-label="Видалити пункт"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
              {checklist.length === 0 && (
                <li className="rounded-md border border-dashed border-border py-3 text-center text-xs text-muted-foreground">
                  Чек-лист порожній
                </li>
              )}
            </ul>
            <div className="flex gap-2">
              <Input
                placeholder="Новий пункт чек-листа..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addChecklistItem()
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addChecklistItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={saving || roomIds.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Створити {roomIds.length > 1 ? `${roomIds.length} завдань` : "завдання"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
