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

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      `
      *,
      guests (id, first_name, last_name, email, phone),
      reservation_rooms (
        id,
        rate,
        rooms (id, room_number, room_type_id, room_type:room_types (id, name))
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

      <EditReservationForm reservation={reservation} roomTypes={roomTypes ?? []} />
    </div>
  )
}
