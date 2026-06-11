import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Users, DollarSign } from "lucide-react"
import Link from "next/link"
import { ReservationsTable } from "@/components/reservations/reservations-table"
import { StatCard } from "@/components/stat-card"
import { formatMoney } from "@/lib/format"
import { normalizeHotelSettings } from "@/lib/hotel-settings"

export const dynamic = "force-dynamic"

export default async function ReservationsPage() {
  const supabase = await createClient()

  // Get all reservations
  const { data: reservations, error: reservationsError } = await supabase
    .from("reservations")
    .select(
      `
      id,
      reservation_number,
      check_in_date,
      check_out_date,
      status,
      total_amount,
      adults,
      children,
      created_at,
      guests (first_name, last_name, email, phone),
      rate_plans (name),
      reservation_rooms (
        rooms!reservation_rooms_room_id_fkey (
          room_number,
          floor,
          room_type:room_types (name)
        )
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

  const { data: hotelSettingsRow } = await supabase.from("hotel_settings").select("*").eq("id", 1).maybeSingle()
  const hotelSettings = normalizeHotelSettings(hotelSettingsRow)

  const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0
  const normalizedReservations = (reservations || []).map((reservation: any) => ({
    ...reservation,
    guests: Array.isArray(reservation.guests) ? reservation.guests[0] || null : reservation.guests,
    rate_plans: Array.isArray(reservation.rate_plans) ? reservation.rate_plans[0] || null : reservation.rate_plans,
    reservation_rooms: (reservation.reservation_rooms || []).map((rr: any) => ({
      ...rr,
      rooms: Array.isArray(rr.rooms) ? rr.rooms[0] || null : rr.rooms,
    })),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Бронювання</h1>
          <p className="text-slate-600">Керуйте всіма бронюваннями та заявками на проживання</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/reservations/new">
            <Plus className="mr-2 h-4 w-4" />
            Нове бронювання
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Активні бронювання"
          value={totalReservations || 0}
          icon={Calendar}
          iconColor="text-blue-600"
          description="Підтверджені та заселені"
        />
        <StatCard
          title="Сьогоднішні заїзди"
          value={todayArrivals || 0}
          icon={Users}
          iconColor="text-green-600"
          description="Очікувані заселення"
        />
        <StatCard
          title="Загальний дохід"
          value={formatMoney(totalRevenue, hotelSettings)}
          icon={DollarSign}
          iconColor="text-emerald-600"
          description="З активних бронювань"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Усі бронювання</CardTitle>
        </CardHeader>
        <CardContent>
          {reservationsError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Не вдалося завантажити бронювання: {reservationsError.message}
            </div>
          ) : (
            <ReservationsTable reservations={normalizedReservations} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
