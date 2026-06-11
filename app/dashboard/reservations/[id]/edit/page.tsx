import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { EditReservationForm } from "@/components/reservations/edit-reservation-form"

export default async function EditReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests (id, first_name, last_name, email, phone),
      reservation_rooms (
        id,
        rate,
        rooms!reservation_rooms_room_id_fkey (id, room_number, room_type_id, room_type:room_types (id, name)),
        moved_from_room:rooms!reservation_rooms_moved_from_room_id_fkey (id, room_number)
      )
    `,
    )
    .eq("id", id)
    .maybeSingle()

  if (!reservation) notFound()

  // Only pending/confirmed reservations can be edited
  if (reservation.status !== "pending" && reservation.status !== "confirmed") {
    redirect(`/dashboard/reservations/${id}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  const isExpired = String(reservation.check_out_date).slice(0, 10) < today
  const canRescheduleExpired = ["system_administrator", "general_manager", "front_desk_manager"].includes(profile?.role)
  if (isExpired && !canRescheduleExpired) {
    redirect(`/dashboard/reservations/${id}`)
  }

  const { data: roomTypes } = await supabase
    .from("room_types")
    .select("id, name, base_rate, base_occupancy, max_occupancy")
    .order("base_rate")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/reservations/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Редагувати бронювання</h1>
          <p className="text-muted-foreground">№ {reservation.reservation_number}</p>
        </div>
      </div>

      <EditReservationForm
        reservation={reservation}
        roomTypes={roomTypes ?? []}
        requiresRescheduleReason={isExpired}
      />
    </div>
  )
}
