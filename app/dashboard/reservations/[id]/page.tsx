import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Mail, Phone, Calendar, Users, DollarSign } from "lucide-react"
import Link from "next/link"

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests (*),
      rate_plans (*),
      reservation_rooms (
        *,
        rooms (*, room_types (*))
      ),
      payments (*)
    `,
    )
    .eq("id", id)
    .single()

  if (!reservation) {
    notFound()
  }

  const statusColors: Record<string, string> = {
    confirmed: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-orange-100 text-orange-800",
    pending: "bg-yellow-100 text-yellow-800",
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Reservation #{reservation.reservation_number}
          </h1>
          <p className="text-slate-600">View and manage reservation details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/reservations/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Badge className={statusColors[reservation.status] || "bg-gray-100 text-gray-800"}>
            {reservation.status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guest Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-600">Name</p>
              <p className="font-medium">
                {reservation.guests.first_name} {reservation.guests.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                {reservation.guests.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Phone</p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" />
                {reservation.guests.phone || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Country</p>
              <p>{reservation.guests.country || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Stay Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-600">Check-in Date</p>
              <p className="font-medium">{new Date(reservation.check_in_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Check-out Date</p>
              <p className="font-medium">{new Date(reservation.check_out_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Nights</p>
              <p className="font-medium">
                {Math.ceil(
                  (new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) /
                    (1000 * 60 * 60 * 24),
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Guests</p>
              <p className="font-medium">
                {reservation.adults} Adults, {reservation.children} Children
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Room Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reservation.reservation_rooms.map((rr: any) => (
              <div key={rr.id}>
                <div>
                  <p className="text-sm text-slate-600">Room Number</p>
                  <p className="font-medium">{rr.rooms?.room_number || "Not Assigned"}</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-slate-600">Room Type</p>
                  <p className="font-medium">{rr.rooms?.room_types?.name}</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-slate-600">Rate Plan</p>
                  <p className="font-medium">{reservation.rate_plans?.name}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-600">Total Amount</p>
              <p className="text-2xl font-bold">${Number(reservation.total_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Paid Amount</p>
              <p className="font-medium text-green-600">${Number(reservation.paid_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Balance</p>
              <p className="font-medium text-orange-600">${Number(reservation.balance).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Payment Status</p>
              <Badge variant={Number(reservation.balance) === 0 ? "default" : "secondary"}>
                {Number(reservation.balance) === 0
                  ? "Paid"
                  : Number(reservation.paid_amount) > 0
                    ? "Partial"
                    : "Pending"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {reservation.special_requests && (
        <Card>
          <CardHeader>
            <CardTitle>Special Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{reservation.special_requests}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
