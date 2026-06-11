import { redirect } from "next/navigation"

import { CheckInForm } from "@/components/front-desk/check-in-form"
import {
  getBlockingReservationStatuses,
  isRoomStateReadyForCheckIn,
} from "@/lib/rooms/availability"
import { normalizeHotelSettings } from "@/lib/hotel-settings"
import { createServerClient } from "@/lib/supabase/server"
import { ReservationActions } from "@/components/reservations/reservation-actions"
import type { UserRole } from "@/lib/types"

function todayDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

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
        rooms!reservation_rooms_room_id_fkey (
          *,
          room_type:room_types (*)
        ),
        moved_from_room:rooms!reservation_rooms_moved_from_room_id_fkey (id, room_number)
      ),
      payments (
        id, amount, payment_method, payment_status, payment_date, transaction_id, transaction_type
      )
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

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  // Якщо номер ще не призначено, показуємо лише готові номери без конфліктів.
  let availableRooms: any[] = []
  const needsAssignment = !reservation.reservation_rooms || reservation.reservation_rooms.length === 0

  if (needsAssignment) {
    const wantedTypeId = reservation.room_type_id ?? null
    const today = todayDateKey()
    const plannedCheckIn = String(reservation.check_in_date).slice(0, 10)
    const effectiveCheckIn = today > plannedCheckIn ? today : plannedCheckIn

    const { data: rooms } = await supabase
      .from("rooms")
      .select(`
        id,
        room_number,
        floor,
        status,
        occupancy_status,
        housekeeping_status,
        operational_status,
        room_type_id,
        room_type:room_types(*)
      `)
      .eq("occupancy_status", "vacant")
      .eq("operational_status", "operational")
      .in("housekeeping_status", ["clean", "inspected"])
      .order("room_number", { ascending: true })

    // Відсіваємо номери, які мають бронь, що перекривається за датами.
    const { data: overlappingRR } = await supabase
      .from("reservation_rooms")
      .select("room_id, reservations!inner(status, check_in_date, check_out_date)")
      .lt("reservations.check_in_date", reservation.check_out_date)
      .gt("reservations.check_out_date", effectiveCheckIn)
      .in("reservations.status", getBlockingReservationStatuses())
      .neq("reservation_id", reservation.id)

    const blocked = new Set<string>((overlappingRR ?? []).map((r: any) => r.room_id).filter(Boolean))
    availableRooms = (rooms ?? [])
      .filter((r) => !blocked.has(r.id))
      .map((room) => ({
        ...room,
        is_requested_type: wantedTypeId ? room.room_type_id === wantedTypeId : true,
        is_ready_for_check_in: isRoomStateReadyForCheckIn(room),
      }))
      .sort((a, b) => {
        if (a.is_requested_type !== b.is_requested_type) return a.is_requested_type ? -1 : 1
        return String(a.room_number).localeCompare(String(b.room_number), "uk", { numeric: true })
      })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Check-in гостя</h1>
        <p className="text-muted-foreground">
          Перевірте передплату, статус номера та заверште процедуру заселення.
        </p>
      </div>

      {todayDateKey() > String(reservation.check_out_date).slice(0, 10) && (
        <ReservationActions
          reservation={reservation}
          hotelSettings={normalizeHotelSettings(hotelSettings)}
          currentUserRole={(currentProfile?.role as UserRole | undefined) ?? null}
        />
      )}

      <CheckInForm
        reservation={reservation}
        availableRooms={availableRooms}
        hotelSettings={normalizeHotelSettings(hotelSettings)}
      />
    </div>
  )
}
