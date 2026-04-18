import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CheckInForm } from "@/components/front-desk/check-in-form"

export default async function CheckInPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch reservation details
  const { data: reservation } = await supabase
    .from("reservations")
    .select(`
      *,
      guests (*),
      reservation_rooms (
        *,
        rooms (
          *,
          room_type:room_types (*)
        )
      )
    `)
    .eq("id", params.id)
    .single()

  if (!reservation) {
    redirect("/dashboard/front-desk")
  }

  // Fetch available rooms of the same type if room not assigned
  let availableRooms = []
  if (!reservation.reservation_rooms || reservation.reservation_rooms.length === 0) {
    const { data } = await supabase.from("rooms").select("*, room_type:room_types(*)").eq("status", "available")

    availableRooms = data || []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Оформити заїзд гостя</h1>
        <p className="text-muted-foreground">Завершити оформлення заїзду</p>
      </div>

      <CheckInForm reservation={reservation} availableRooms={availableRooms} />
    </div>
  )
}
