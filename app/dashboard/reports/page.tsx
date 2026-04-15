import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OccupancyReport } from "@/components/reports/occupancy-report"
import { RevenueReport } from "@/components/reports/revenue-report"
import { ReservationsReport } from "@/components/reports/reservations-report"

export default async function ReportsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch data for reports
  const today = new Date().toISOString().split("T")[0]

  // Get occupancy data
  const { data: rooms } = await supabase.from("rooms").select("*")
  const { data: occupiedRooms } = await supabase.from("rooms").select("*").eq("status", "occupied")

  // Get revenue data for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const { data: recentPayments } = await supabase
    .from("payments")
    .select("amount, created_at")
    .gte("created_at", thirtyDaysAgo)
    .eq("transaction_type", "payment")

  // Get reservations data
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .gte("check_in_date", thirtyDaysAgo)
    .order("check_in_date", { ascending: false })

  const occupancyRate = rooms && occupiedRooms ? ((occupiedRooms.length / rooms.length) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">View hotel performance metrics and insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Current Occupancy</p>
            <p className="text-3xl font-bold">{occupancyRate}%</p>
            <p className="text-xs text-muted-foreground">
              {occupiedRooms?.length || 0} of {rooms?.length || 0} rooms occupied
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Reservations (30d)</p>
            <p className="text-3xl font-bold">{reservations?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Revenue (30d)</p>
            <p className="text-3xl font-bold">
              ${recentPayments?.reduce((sum, p) => sum + p.amount, 0).toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="occupancy" className="w-full">
        <TabsList>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy" className="mt-6">
          <OccupancyReport rooms={rooms || []} occupiedRooms={occupiedRooms || []} />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueReport payments={recentPayments || []} />
        </TabsContent>

        <TabsContent value="reservations" className="mt-6">
          <ReservationsReport reservations={reservations || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
