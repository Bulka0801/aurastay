import { createClient } from "@/lib/supabase/server"
import { NewReservationForm } from "@/components/reservations/new-reservation-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { normalizeHotelSettings } from "@/lib/hotel-settings"

type SearchParams = {
  guestId?: string
  roomId?: string
  checkIn?: string
  checkOut?: string
  adults?: string
  children?: string
}

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const supabase = await createClient()
  const resolvedSearchParams = await Promise.resolve(searchParams)
  const roomId = resolvedSearchParams?.roomId?.trim() || ""
  const guestId = resolvedSearchParams?.guestId?.trim() || ""
  const checkIn = resolvedSearchParams?.checkIn?.trim() || ""
  const checkOut = resolvedSearchParams?.checkOut?.trim() || ""

  const parsedAdults = resolvedSearchParams?.adults?.trim()
    ? Number.parseInt(resolvedSearchParams.adults.trim(), 10)
    : undefined
  const parsedChildren = resolvedSearchParams?.children?.trim()
    ? Number.parseInt(resolvedSearchParams.children.trim(), 10)
    : undefined

  // Get room types
  const { data: roomTypes } = await supabase
    .from("room_types")
    .select("*")
    .eq("is_active", true)
    .order("base_rate", { ascending: true })

  // Get rate plans
  const { data: ratePlans } = await supabase
    .from("rate_plans")
    .select("*")
    .eq("is_active", true)
    .order("discount_percentage", { ascending: false })

  const { data: hotelSettings } = await supabase
    .from("hotel_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()

  const { data: selectedRoom } = roomId
    ? await supabase
        .from("rooms")
        .select(
          `
          id,
          room_number,
          room_type_id,
          room_types ( id, name, code, base_rate, max_occupancy )
        `,
        )
        .eq("id", roomId)
        .maybeSingle()
    : { data: null }

  const { data: initialGuest } = guestId
    ? await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, country, passport_number, id_number, is_vip")
        .eq("id", guestId)
        .maybeSingle()
    : { data: null }

  const initialReservationContext =
    roomId && checkIn && checkOut
      ? {
          roomId,
          roomNumber: selectedRoom?.room_number ?? null,
          roomTypeId: selectedRoom?.room_type_id ?? null,
          checkIn,
          checkOut,
          adults: parsedAdults && !Number.isNaN(parsedAdults) ? parsedAdults : undefined,
          children: parsedChildren && !Number.isNaN(parsedChildren) ? parsedChildren : undefined,
        }
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Нове бронювання</h1>
        <p className="text-slate-600">
          Створіть нове бронювання. Бронювання створюється зі статусом «Очікує передплату» і підтверджується
          автоматично після внесення передплати.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Деталі бронювання</CardTitle>
        </CardHeader>
        <CardContent>
          <NewReservationForm
            roomTypes={roomTypes || []}
            ratePlans={ratePlans || []}
            hotelSettings={normalizeHotelSettings(hotelSettings)}
            initialGuest={initialGuest}
            initialReservationContext={initialReservationContext}
          />
        </CardContent>
      </Card>
    </div>
  )
}
