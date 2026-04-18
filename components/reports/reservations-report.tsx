"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatReservationStatus } from "@/lib/localization"

interface Reservation {
  id: string
  status: string
  channel: string
  created_at: string
}

export function ReservationsReport({ reservations }: { reservations: Reservation[] }) {
  const statusCounts = {
    pending: reservations.filter((r) => r.status === "pending").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    checked_in: reservations.filter((r) => r.status === "checked_in").length,
    checked_out: reservations.filter((r) => r.status === "checked_out").length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  }

  const channelCounts = reservations.reduce(
    (acc, reservation) => {
      acc[reservation.channel] = (acc[reservation.channel] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Статуси бронювань</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatReservationStatus("pending")}</span>
            <Badge variant="outline">{statusCounts.pending}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatReservationStatus("confirmed")}</span>
            <Badge className="bg-blue-100 text-blue-800">{statusCounts.confirmed}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatReservationStatus("checked_in")}</span>
            <Badge className="bg-green-100 text-green-800">{statusCounts.checked_in}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatReservationStatus("checked_out")}</span>
            <Badge className="bg-gray-100 text-gray-800">{statusCounts.checked_out}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{formatReservationStatus("cancelled")}</span>
            <Badge className="bg-red-100 text-red-800">{statusCounts.cancelled}</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Канали бронювання</h3>
        <div className="space-y-3">
          {Object.entries(channelCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([channel, count]) => (
              <div key={channel} className="flex items-center justify-between">
                <span className="text-sm">{channel}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{count}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {((count / reservations.length) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}
