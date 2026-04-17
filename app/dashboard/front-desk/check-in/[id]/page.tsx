import { redirect } from "next/navigation"

import { CheckInForm } from "@/components/front-desk/check-in-form"
import { createServerClient } from "@/lib/supabase/server"

export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Бронювання + гість + рядки reservation_rooms + платежі (payments.reservation_id)
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
      ),
      payments (
        id, amount, payment_method, payment_status, payment_date
      )
    `)
    .eq("id", id)
    .single()

  if (!reservation) {
    redirect("/dashboard/front-desk")
  }

  // Якщо номер ще не призначено — шукаємо лише ті, що підходять за типом (якщо відомо)
  // і перебувають у «готовому» статусі: available або inspecting.
  let availableRooms: any[] = []
  const needsAssignment = !reservation.reservation_rooms || reservation.reservation_rooms.length === 0

  if (needsAssignment) {
    const wantedTypeId = reservation.room_type_id ?? null

    let query = supabase
      .from("rooms")
      .select("id, room_number, floor, status, room_type_id, room_type:room_types(*)")
      .in("status", ["available", "inspecting"])
      .order("room_number", { ascending: true })

    if (wantedTypeId) {
      query = query.eq("room_type_id", wantedTypeId)
    }

    const { data: rooms } = await query

    // Відсіваємо номери, які мають бронь, що перекривається за датами.
    const { data: overlappingRR } = await supabase
      .from("reservation_rooms")
      .select("room_id, reservations!inner(status, check_in_date, check_out_date)")
      .lt("reservations.check_in_date", reservation.check_out_date)
      .gt("reservations.check_out_date", reservation.check_in_date)
      .in("reservations.status", ["pending", "confirmed", "checked_in"])
      .neq("reservation_id", reservation.id)

    const blocked = new Set<string>((overlappingRR ?? []).map((r: any) => r.room_id).filter(Boolean))
    availableRooms = (rooms ?? []).filter((r) => !blocked.has(r.id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Check-in гостя</h1>
        <p className="text-muted-foreground">
          Перевірте передплату, статус номера та заверште процедуру заселення.
        </p>
      </div>

      <CheckInForm reservation={reservation} availableRooms={availableRooms} />
    </div>
  )
}
