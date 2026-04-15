import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { TrendingUp, Users, DollarSign, Percent, BarChart3, DoorOpen } from "lucide-react"
import Link from "next/link"
import type { Profile } from "@/lib/types"

interface ManagerDashboardProps {
  profile: Profile
}

export async function ManagerDashboard({ profile }: ManagerDashboardProps) {
  const supabase = await createClient()

  // Calculate occupancy
  const { count: totalRooms } = await supabase.from("rooms").select("*", { count: "exact", head: true })

  const { count: occupiedRooms } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("status", "checked_in")

  const occupancy = totalRooms ? ((occupiedRooms || 0) / totalRooms) * 100 : 0

  // Get today's revenue
  const today = new Date().toISOString().split("T")[0]
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount")
    .gte("payment_date", `${today}T00:00:00`)

  const todayRevenue = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

  // Calculate ADR (Average Daily Rate)
  const { data: checkedInReservations } = await supabase
    .from("reservations")
    .select("total_amount, check_in_date, check_out_date")
    .eq("status", "checked_in")

  let totalNights = 0
  let totalRevenue = 0
  checkedInReservations?.forEach((res) => {
    const checkIn = new Date(res.check_in_date)
    const checkOut = new Date(res.check_out_date)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    totalNights += nights
    totalRevenue += Number(res.total_amount)
  })
  const adr = totalNights > 0 ? totalRevenue / totalNights : 0

  // Calculate RevPAR
  const revpar = totalRooms ? totalRevenue / totalRooms : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Management Dashboard</h1>
          <p className="text-slate-600">Welcome, {profile.first_name}! Key performance indicators and insights</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/reports">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Percent className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancy.toFixed(1)}%</div>
            <p className="text-xs text-slate-600">Current occupancy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupiedRooms || 0}</div>
            <p className="text-xs text-slate-600">In-house</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ADR</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${adr.toFixed(2)}</div>
            <p className="text-xs text-slate-600">Average daily rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RevPAR</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${revpar.toFixed(2)}</div>
            <p className="text-xs text-slate-600">Revenue per available room</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Revenue</span>
                <span className="font-semibold">${todayRevenue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Occupied Rooms</span>
                <span className="font-semibold">{occupiedRooms}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Available Rooms</span>
                <span className="font-semibold">{(totalRooms || 0) - (occupiedRooms || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/dashboard/reservations">
                <Users className="mr-2 h-4 w-4" />
                View Reservations
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/dashboard/reports">
                <BarChart3 className="mr-2 h-4 w-4" />
                Financial Reports
              </Link>
            </Button>
            <Button asChild className="w-full justify-start bg-transparent" variant="outline">
              <Link href="/dashboard/rooms">
                <DoorOpen className="mr-2 h-4 w-4" />
                Room Status
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
