import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Users, DollarSign } from "lucide-react"
import Link from "next/link"
import { ReservationsTable } from "@/components/reservations/reservations-table"
import { StatCard } from "@/components/stat-card"

export default async function ReservationsPage() {
  const supabase = await createClient()

  // Get all reservations
  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests (first_name, last_name, email, phone),
      rate_plans (name),
      reservation_rooms (
        rooms (room_number, room_types (name))
      )
    `,
    )
    .order("created_at", { ascending: false })

  // Get statistics
  const { count: totalReservations } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .in("status", ["confirmed", "checked_in"])

  const { count: todayArrivals } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("check_in_date", new Date().toISOString().split("T")[0])
    .eq("status", "confirmed")

  const { data: revenueData } = await supabase
    .from("reservations")
    .select("total_amount")
    .in("status", ["confirmed", "checked_in"])

  const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reservations</h1>
          <p className="text-slate-600">Manage all hotel reservations and bookings</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/reservations/new">
            <Plus className="mr-2 h-4 w-4" />
            New Reservation
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Active Reservations"
          value={totalReservations || 0}
          icon={Calendar}
          iconColor="text-blue-600"
          description="Confirmed and checked-in"
        />
        <StatCard
          title="Today's Arrivals"
          value={todayArrivals || 0}
          icon={Users}
          iconColor="text-green-600"
          description="Expected check-ins"
        />
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          description="From active reservations"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <ReservationsTable reservations={reservations || []} />
        </CardContent>
      </Card>
    </div>
  )
}
