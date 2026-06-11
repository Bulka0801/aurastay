"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { CheckCircle, Clock, AlertCircle } from "lucide-react"
import { formatPriority, formatTaskType } from "@/lib/localization"
import { shouldAutoCreateInspection } from "@/lib/rules/transitions"

interface Task {
  id: string
  room_id: string
  task_type: string
  status: string
  priority: string
  notes: string | null
  created_at: string
  completed_at: string | null
  rooms: {
    room_number: string
    room_type: {
      name: string
    }
  }
  assigned_to_profile: {
    first_name: string
    last_name: string
  } | null
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  normal: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
}

const statusIcons = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle,
}

const statusLabels: Record<string, string> = {
  all: "Усі",
  pending: "Очікує",
  in_progress: "У роботі",
  completed: "Виконано",
}

export function TasksList({ tasks }: { tasks: Task[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [updating, setUpdating] = useState<string | null>(null)

  const filteredTasks = tasks.filter((task) => filter === "all" || task.status === filter)

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdating(taskId)
    const supabase = createClient()

    try {
      const updateData: any = { status: newStatus }
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString()
      }

      const task = tasks.find((t) => t.id === taskId)
      await supabase.from("housekeeping_tasks").update(updateData).eq("id", taskId)

      if (newStatus === "completed" && task?.room_id && shouldAutoCreateInspection(task.task_type)) {
        await supabase.from("housekeeping_tasks").insert({
          room_id: task.room_id,
          task_type: "inspection",
          priority: task.priority,
          status: "pending",
          notes: `Автоматична перевірка після ${formatTaskType(task.task_type).toLowerCase()}`,
        })
      }
      router.refresh()
    } catch (error) {
      console.error("Error updating task status:", error)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Усі ({tasks.length})
        </Button>
        <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
          Очікують ({tasks.filter((t) => t.status === "pending").length})
        </Button>
        <Button
          variant={filter === "in_progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("in_progress")}
        >
          У роботі ({tasks.filter((t) => t.status === "in_progress").length})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Виконано ({tasks.filter((t) => t.status === "completed").length})
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Завдань не знайдено</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => {
            const StatusIcon = statusIcons[task.status as keyof typeof statusIcons]
            return (
              <Card key={task.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <StatusIcon className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Номер {task.rooms.room_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.rooms.room_type.name}
                        </Badge>
                        <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                          {formatPriority(task.priority)}
                        </Badge>
                      </div>
                      <p className="text-sm">{formatTaskType(task.task_type)}</p>
                      {task.notes && <p className="text-sm text-muted-foreground">{task.notes}</p>}
                      {task.assigned_to_profile && (
                        <p className="text-xs text-muted-foreground">
                          Виконавець: {task.assigned_to_profile.first_name} {task.assigned_to_profile.last_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Створено: {new Date(task.created_at).toLocaleString("uk-UA")}
                      </p>
                    </div>
                  </div>
                  <div className="w-40">
                    <Select
                      value={task.status}
                      onValueChange={(value) => handleStatusChange(task.id, value)}
                      disabled={updating === task.id}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{statusLabels.pending}</SelectItem>
                        <SelectItem value="in_progress">{statusLabels.in_progress}</SelectItem>
                        <SelectItem value="completed">{statusLabels.completed}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
