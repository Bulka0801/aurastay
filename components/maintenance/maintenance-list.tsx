"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AlertTriangle, Wrench, CheckCircle } from "lucide-react"

interface MaintenanceRequest {
  id: string
  room_id: string
  issue_type: string
  description: string
  priority: string
  status: string
  created_at: string
  resolved_at: string | null
  rooms: {
    room_number: string
    room_type: {
      name: string
    }
  }
  reported_by_profile: {
    first_name: string
    last_name: string
  }
  assigned_to_profile: {
    first_name: string
    last_name: string
  } | null
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
  urgent: "bg-red-600 text-white",
}

const statusIcons = {
  reported: AlertTriangle,
  in_progress: Wrench,
  resolved: CheckCircle,
}

export function MaintenanceList({ requests }: { requests: MaintenanceRequest[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "reported" | "in_progress" | "resolved">("all")
  const [updating, setUpdating] = useState<string | null>(null)

  const filteredRequests = requests.filter((req) => filter === "all" || req.status === filter)

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    setUpdating(requestId)
    const supabase = createClient()

    try {
      const updateData: any = { status: newStatus }
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString()

        // Update room status back to available
        const request = requests.find((r) => r.id === requestId)
        if (request) {
          await supabase.from("rooms").update({ status: "available" }).eq("id", request.room_id)
        }
      }

      await supabase.from("maintenance_requests").update(updateData).eq("id", requestId)

      router.refresh()
    } catch (error) {
      console.error("Error updating request status:", error)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          All ({requests.length})
        </Button>
        <Button variant={filter === "reported" ? "default" : "outline"} size="sm" onClick={() => setFilter("reported")}>
          Reported ({requests.filter((r) => r.status === "reported").length})
        </Button>
        <Button
          variant={filter === "in_progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("in_progress")}
        >
          In Progress ({requests.filter((r) => r.status === "in_progress").length})
        </Button>
        <Button variant={filter === "resolved" ? "default" : "outline"} size="sm" onClick={() => setFilter("resolved")}>
          Resolved ({requests.filter((r) => r.status === "resolved").length})
        </Button>
      </div>

      {filteredRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No maintenance requests found</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredRequests.map((request) => {
            const StatusIcon = statusIcons[request.status as keyof typeof statusIcons]
            return (
              <Card key={request.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <StatusIcon className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Room {request.rooms.room_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {request.rooms.room_type.name}
                        </Badge>
                        <Badge className={priorityColors[request.priority as keyof typeof priorityColors]}>
                          {request.priority}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium capitalize">{request.issue_type.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Reported by: {request.reported_by_profile.first_name} {request.reported_by_profile.last_name}
                        </span>
                        {request.assigned_to_profile && (
                          <span>
                            Assigned to: {request.assigned_to_profile.first_name}{" "}
                            {request.assigned_to_profile.last_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="w-40">
                    <Select
                      value={request.status}
                      onValueChange={(value) => handleStatusChange(request.id, value)}
                      disabled={updating === request.id}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reported">Reported</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
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
