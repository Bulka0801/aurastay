import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CheckOutForm } from "@/components/front-desk/check-out-form"

export default async function CheckOutPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch reservation with folio and payments
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
      folios (
        *,
        payments (*)
      )
    `)
    .eq("id", params.id)
    .single()

  if (!reservation) {
    redirect("/dashboard/front-desk")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Check-Out Guest</h1>
        <p className="text-muted-foreground">Complete the check-out process</p>
      </div>

      <CheckOutForm reservation={reservation} />
    </div>
  )
}
