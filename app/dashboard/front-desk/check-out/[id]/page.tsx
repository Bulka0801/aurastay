import { redirect } from "next/navigation"

import { CheckOutForm } from "@/components/front-desk/check-out-form"
import { normalizeHotelSettings } from "@/lib/hotel-settings"
import { createServerClient } from "@/lib/supabase/server"

export default async function CheckOutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select(`
      *,
      guests (*),
      reservation_rooms (
        *,
        rooms!reservation_rooms_room_id_fkey (
          *,
          room_type:room_types (*)
        ),
        moved_from_room:rooms!reservation_rooms_moved_from_room_id_fkey (id, room_number)
      ),
      payments (
        id, amount, payment_method, payment_status, payment_date, transaction_type
      ),
      folios ( id, status )
    `)
    .eq("id", id)
    .single()

  if (!reservation) {
    redirect("/dashboard/front-desk")
  }

  const { data: hotelSettings } = await supabase
    .from("hotel_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Check-out гостя</h1>
        <p className="text-muted-foreground">
          Виселення дозволене лише за умови повного погашення балансу.
        </p>
      </div>

      <CheckOutForm reservation={reservation} hotelSettings={normalizeHotelSettings(hotelSettings)} />
    </div>
  )
}
