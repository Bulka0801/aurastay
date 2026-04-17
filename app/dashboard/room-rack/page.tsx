import { createClient } from "@/lib/supabase/server"
import { RoomRackClient } from "@/components/room-rack/room-rack-client"
import type { RackBlock, RackRoom } from "@/lib/room-rack/types"

export const dynamic = "force-dynamic"

export default async function RoomRackPage() {
  const supabase = await createClient()

  // Завантажуємо номери з типами — це базова колонка ліворуч
  const { data: roomsData } = await supabase
    .from("rooms")
    .select(
      `
      id, room_number, floor, status, room_type_id, notes,
      room_types ( id, name, code, base_rate, max_occupancy )
    `,
    )
    .order("room_number", { ascending: true })

  // Завантажуємо активні бронювання (за останні/майбутні 180 днів)
  // Фільтр по активних статусах для оптимізації
  const nowIso = new Date().toISOString().split("T")[0]
  const pastWindow = new Date()
  pastWindow.setDate(pastWindow.getDate() - 60)
  const futureWindow = new Date()
  futureWindow.setDate(futureWindow.getDate() + 180)

  const pastIso = pastWindow.toISOString().split("T")[0]
  const futureIso = futureWindow.toISOString().split("T")[0]

  const { data: resvData } = await supabase
    .from("reservations")
    .select(
      `
      id, reservation_number, check_in_date, check_out_date, status,
      total_amount, paid_amount, adults, children, special_requests, notes,
      guests ( id, first_name, last_name, email, phone, is_vip ),
      reservation_rooms ( id, room_id, rate )
    `,
    )
    .gte("check_out_date", pastIso)
    .lte("check_in_date", futureIso)
    .in("status", ["pending", "confirmed", "checked_in", "checked_out"])

  // Переформатування у плоскі типи для клієнта
  const rooms: RackRoom[] = (roomsData || []).map((r: any) => ({
    id: r.id,
    room_number: r.room_number,
    floor: r.floor,
    status: r.status,
    room_type_id: r.room_type_id,
    room_type_name: r.room_types?.name ?? "—",
    room_type_code: r.room_types?.code,
    base_rate: r.room_types?.base_rate ? Number(r.room_types.base_rate) : undefined,
    max_occupancy: r.room_types?.max_occupancy,
    notes: r.notes,
  }))

  const blocks: RackBlock[] = []
  for (const res of resvData || []) {
    const r = res as any
    const rooms = r.reservation_rooms || []
    const paid = Number(r.paid_amount || 0)
    const total = Number(r.total_amount || 0)
    for (const rr of rooms) {
      blocks.push({
        reservation_room_id: rr.id,
        reservation_id: r.id,
        reservation_number: r.reservation_number,
        room_id: rr.room_id,
        guest: {
          id: r.guests?.id,
          first_name: r.guests?.first_name ?? "—",
          last_name: r.guests?.last_name ?? "",
          email: r.guests?.email,
          phone: r.guests?.phone,
          is_vip: !!r.guests?.is_vip,
        },
        check_in: r.check_in_date,
        check_out: r.check_out_date,
        nights: Math.max(
          1,
          Math.round(
            (new Date(r.check_out_date).getTime() - new Date(r.check_in_date).getTime()) / (1000 * 60 * 60 * 24),
          ),
        ),
        status: r.status,
        payment_status: paid >= total && total > 0 ? "paid" : paid > 0 ? "partial" : "pending",
        total_amount: total,
        paid_amount: paid,
        balance: total - paid,
        adults: r.adults || 1,
        children: r.children || 0,
        rate: rr.rate ? Number(rr.rate) : undefined,
        special_requests: r.special_requests,
      })
    }
  }

  // Сьогоднішній день для дефолтного anchor (рядок yyyy-mm-dd лишаємо без часу)
  return (
    <div className="-mx-6 -my-6 md:-mx-8 md:-my-8">
      <RoomRackClient rooms={rooms} blocks={blocks} today={nowIso} />
    </div>
  )
}
