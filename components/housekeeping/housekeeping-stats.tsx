"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, BedDouble, Brush, CheckCircle2, ClipboardCheck, Sparkles } from "lucide-react"
import type { HKTask, Room } from "./types"

interface Props {
  rooms: Room[]
  tasks: HKTask[]
}

export function HousekeepingStats({ rooms, tasks }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const dirty = rooms.filter((r) => r.status === "dirty").length
  const cleaning = rooms.filter((r) => r.status === "cleaning").length
  const ready = rooms.filter((r) => r.status === "available" || r.status === "inspected").length

  const todayTasks = tasks.filter((t) => t.scheduled_date === today || !t.scheduled_date)
  const inProgress = tasks.filter((t) => t.status === "in_progress" || t.status === "paused").length
  const completedToday = tasks.filter(
    (t) => t.status === "completed" && t.completed_at?.slice(0, 10) === today,
  ).length
  const urgent = todayTasks.filter((t) => t.priority === "urgent" && t.status !== "completed").length

  const items = [
    { label: "Очікує прибирання", value: dirty, icon: Brush, tone: "bg-rose-100 text-rose-700" },
    { label: "Прибирається зараз", value: cleaning, icon: Sparkles, tone: "bg-amber-100 text-amber-700" },
    { label: "У процесі (всі)", value: inProgress, icon: ClipboardCheck, tone: "bg-sky-100 text-sky-700" },
    { label: "Готові кімнати", value: ready, icon: BedDouble, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Завершено сьогодні", value: completedToday, icon: CheckCircle2, tone: "bg-teal-100 text-teal-700" },
    { label: "Термінових", value: urgent, icon: AlertCircle, tone: "bg-red-100 text-red-700" },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="flex items-center gap-3 p-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${it.tone}`}>
              <it.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{it.value}</p>
              <p className="truncate text-[11px] text-muted-foreground">{it.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
